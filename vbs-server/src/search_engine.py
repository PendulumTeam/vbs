"""FAISS vector search engine with BEiT3 model for text embeddings."""

import os
import sys
import json
import numpy as np
import torch
import faiss
from typing import List, Tuple, Dict, Any
from transformers import XLMRobertaTokenizer
from dotenv import load_dotenv

# Fix protobuf compatibility issue
os.environ['PROTOCOL_BUFFERS_PYTHON_IMPLEMENTATION'] = 'python'
# Fix OpenMP duplicate library issue
os.environ['KMP_DUPLICATE_LIB_OK'] = 'TRUE'

# Load environment variables
load_dotenv()

# Add BEiT3 path to sys.path (when running from vbs-server directory)
BEIT3_PATH = os.path.abspath("./beit3")
if os.path.exists(BEIT3_PATH):
    sys.path.append(BEIT3_PATH)

# Model configuration (paths when running from vbs-server directory)
MODEL_PATH = os.getenv('MODEL_PATH', './models/beit3.spm')
MODEL_WEIGHT_PATH = os.getenv('MODEL_WEIGHT_PATH', './models/beit3_large_patch16_384.pth')
FAISS_INDEX_PATH = os.getenv('FAISS_INDEX_PATH', './models/batch1.bin')
FRAME_IDS_PATH = os.getenv('FRAME_IDS_PATH', './models/batch1.json')
MAX_LEN = int(os.getenv('MAX_LEN', '64'))

# Device configuration
device = torch.device('cuda' if torch.cuda.is_available() else 'cpu')

# Global model components
tokenizer = None
model = None
faiss_index = None
frame_ids = None


def get_sentencepiece_model_for_beit3(model_path):
    """Load BEiT3 tokenizer"""
    return XLMRobertaTokenizer(model_path)


def load_models():
    """Load all model components."""
    global tokenizer, model, faiss_index, frame_ids

    try:
        # Load tokenizer with fallback
        try:
            tokenizer = get_sentencepiece_model_for_beit3(MODEL_PATH)
            print(f"✅ Tokenizer loaded from {MODEL_PATH}")
        except Exception as e:
            print(f"⚠️ Error loading custom tokenizer: {e}")
            print("Using fallback tokenizer...")
            tokenizer = XLMRobertaTokenizer.from_pretrained("xlm-roberta-base")
            print("✅ Fallback tokenizer loaded")

        # Load BEiT3 model
        from modeling_finetune import beit3_large_patch16_384_retrieval
        model = beit3_large_patch16_384_retrieval(pretrained=True)
        checkpoint = torch.load(MODEL_WEIGHT_PATH, map_location=device)
        model.load_state_dict(checkpoint['model'])
        model.to(device)
        model.eval()
        print(f"✅ BEiT3 large model loaded from {MODEL_WEIGHT_PATH}")

        # Load FAISS index
        faiss_index = faiss.read_index(FAISS_INDEX_PATH)
        print(f"✅ FAISS index loaded from {FAISS_INDEX_PATH} ({faiss_index.ntotal} vectors)")

        # Load frame IDs
        with open(FRAME_IDS_PATH, 'r') as f:
            frame_ids = json.load(f)
        print(f"✅ Frame IDs loaded from {FRAME_IDS_PATH} ({len(frame_ids)} frames)")

        return True

    except Exception as e:
        print(f"❌ Error loading models: {e}")
        return False


def is_loaded() -> bool:
    """Check if all models are loaded."""
    return all([tokenizer, model, faiss_index, frame_ids])


def to_text_tokens(text: str, tokenizer, max_len: int = MAX_LEN) -> Tuple[torch.Tensor, torch.Tensor]:
    """
    Convert text to tokens for BEiT3 model.

    Args:
        text: Input text
        tokenizer: BEiT3 tokenizer
        max_len: Maximum sequence length

    Returns:
        Tuple of (token_ids_tensor, padding_mask_tensor)
    """
    tokens_orig = tokenizer.tokenize(text)
    token_ids = tokenizer.convert_tokens_to_ids(tokens_orig)
    tokens = token_ids

    if len(tokens) > max_len - 2:
        tokens = tokens[:max_len - 2]

    tokens = [tokenizer.bos_token_id] + tokens[:] + [tokenizer.eos_token_id]
    num_tokens = len(tokens)
    padding_mask = [0] * num_tokens + [1] * (max_len - num_tokens)
    tokens_true = tokens + [tokenizer.pad_token_id] * (max_len - num_tokens)

    padding_mask_tensor = torch.tensor(padding_mask).reshape(1, -1).to(device)
    token_ids_tensor = torch.tensor(tokens_true).reshape(1, -1).to(device)

    return token_ids_tensor, padding_mask_tensor


def calc_text_embedding(text: str, tokenizer) -> torch.Tensor:
    """
    Calculate text embedding using BEiT3 model.

    Args:
        text: Input text
        tokenizer: BEiT3 tokenizer

    Returns:
        Text embedding tensor
    """
    if not model:
        raise RuntimeError("Model not loaded")

    tokens, attention_mask = to_text_tokens(text, tokenizer)

    with torch.no_grad():
        outputs = model(
            text_description=tokens,
            padding_mask=attention_mask,
            only_infer=True
        )

    return outputs[1]  # Text embedding output


def encode_text_query(text_query: str) -> np.ndarray:
    """
    Encode text query into normalized embedding vector.

    Args:
        text_query: Input text query

    Returns:
        Normalized embedding vector as numpy array
    """
    if not tokenizer:
        raise RuntimeError("Tokenizer not loaded")

    text_embedding = calc_text_embedding(text_query, tokenizer).cpu().detach().numpy().flatten()
    text_embedding = text_embedding / np.linalg.norm(text_embedding)
    return text_embedding


def vector_search(query_embedding: np.ndarray, limit: int = 20) -> Tuple[List[str], List[float]]:
    """
    Perform FAISS vector similarity search.

    Args:
        query_embedding: Query embedding vector
        limit: Number of results to return

    Returns:
        Tuple of (frame_ids, similarity_scores)
    """
    if not faiss_index or not frame_ids:
        raise RuntimeError("FAISS index or frame IDs not loaded")

    # Ensure query vector is the right shape
    query_vector = query_embedding.reshape(1, -1).astype('float32')

    # Perform FAISS search
    distances, indices = faiss_index.search(query_vector, limit)

    # Map indices to frame IDs with scores
    result_frame_ids = []
    result_scores = []

    for i in range(limit):
        idx = indices[0][i]
        if 0 <= idx < len(frame_ids):
            result_frame_ids.append(frame_ids[idx])
            result_scores.append(float(distances[0][i]))

    return result_frame_ids, result_scores


def search_text(query: str, limit: int = 20) -> List[Dict[str, Any]]:
    """
    Perform complete text-to-image search.

    Args:
        query: Text search query
        limit: Number of results to return

    Returns:
        List of search results with frame IDs and scores
    """
    if not is_loaded():
        raise RuntimeError("Models not loaded. Call load_models() first.")

    # Generate text embedding
    text_embedding = encode_text_query(query)

    # Perform vector search
    frame_ids_found, scores = vector_search(text_embedding, limit)

    # Build results
    results = []
    for frame_id, score in zip(frame_ids_found, scores):
        results.append({
            "image_id": frame_id,
            "score": score,
            "s3_key": frame_id  # Assuming frame_id maps to s3_key
        })

    # Sort by score (lower distance = higher similarity)
    results.sort(key=lambda x: x['score'])

    return results
