// MongoDB initialization script
// This runs when the container starts for the first time

// Switch to the vbs_db database
db = db.getSiblingDB('vbs_db');

// Create application user
db.createUser({
  user: 'vbs_user',
  pwd: 'vbs_pass',
  roles: [
    {
      role: 'readWrite',
      db: 'vbs_db'
    }
  ]
});

// Create collections with validation schemas

// Videos collection
db.createCollection('videos', {
  validator: {
    $jsonSchema: {
      bsonType: 'object',
      required: ['video_id', 'title', 'duration', 'frame_count', 'created_at'],
      properties: {
        video_id: {
          bsonType: 'string',
          description: 'Unique identifier for the video'
        },
        title: {
          bsonType: 'string',
          description: 'Video title'
        },
        duration: {
          bsonType: 'number',
          description: 'Video duration in seconds'
        },
        frame_count: {
          bsonType: 'int',
          description: 'Total number of frames'
        },
        metadata: {
          bsonType: 'object',
          description: 'Additional video metadata'
        },
        created_at: {
          bsonType: 'date'
        }
      }
    }
  }
});

// Embeddings collection with vector search support
db.createCollection('embeddings', {
  validator: {
    $jsonSchema: {
      bsonType: 'object',
      required: ['video_id', 'frame_number', 'embedding', 'timestamp'],
      properties: {
        video_id: {
          bsonType: 'string',
          description: 'Reference to video'
        },
        frame_number: {
          bsonType: 'int',
          description: 'Frame number in video'
        },
        embedding: {
          bsonType: 'array',
          description: 'GME embedding vector',
          items: {
            bsonType: 'double'
          }
        },
        description: {
          bsonType: 'string',
          description: 'GME generated description'
        },
        objects: {
          bsonType: 'array',
          description: 'Detected objects',
          items: {
            bsonType: 'string'
          }
        },
        scene_type: {
          bsonType: 'string',
          description: 'Scene classification'
        },
        timestamp: {
          bsonType: 'double',
          description: 'Frame timestamp in seconds'
        }
      }
    }
  }
});

// Search history collection
db.createCollection('search_history', {
  validator: {
    $jsonSchema: {
      bsonType: 'object',
      required: ['query', 'timestamp', 'results_count'],
      properties: {
        query: {
          bsonType: 'string'
        },
        filters: {
          bsonType: 'object'
        },
        results_count: {
          bsonType: 'int'
        },
        response_time_ms: {
          bsonType: 'double'
        },
        timestamp: {
          bsonType: 'date'
        }
      }
    }
  }
});

// Chat sessions collection
db.createCollection('chat_sessions', {
  validator: {
    $jsonSchema: {
      bsonType: 'object',
      required: ['session_id', 'user_id', 'created_at'],
      properties: {
        session_id: {
          bsonType: 'string'
        },
        user_id: {
          bsonType: 'string'
        },
        messages: {
          bsonType: 'array',
          items: {
            bsonType: 'object',
            required: ['role', 'content', 'timestamp'],
            properties: {
              role: {
                enum: ['user', 'assistant'],
                description: 'Message sender role'
              },
              content: {
                bsonType: 'string'
              },
              timestamp: {
                bsonType: 'date'
              }
            }
          }
        },
        created_at: {
          bsonType: 'date'
        },
        updated_at: {
          bsonType: 'date'
        }
      }
    }
  }
});

// Create indexes for performance

// Videos indexes
db.videos.createIndex({ video_id: 1 }, { unique: true });
db.videos.createIndex({ created_at: -1 });

// Embeddings indexes
db.embeddings.createIndex({ video_id: 1, frame_number: 1 }, { unique: true });
db.embeddings.createIndex({ scene_type: 1 });
db.embeddings.createIndex({ objects: 1 });
db.embeddings.createIndex({ timestamp: 1 });

// For vector similarity search (requires MongoDB Atlas or special build)
// db.embeddings.createIndex({ embedding: "vectorSearch" });

// Search history indexes
db.search_history.createIndex({ timestamp: -1 });
db.search_history.createIndex({ query: "text" });

// Chat sessions indexes
db.chat_sessions.createIndex({ session_id: 1 }, { unique: true });
db.chat_sessions.createIndex({ user_id: 1 });
db.chat_sessions.createIndex({ updated_at: -1 });

print('MongoDB initialization completed successfully!');