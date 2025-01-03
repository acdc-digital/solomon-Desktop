// convex/chunks.ts
// /Users/matthewsimon/Documents/Github/solomon-electron/next/convex/chunks.ts

import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { Id } from "./_generated/dataModel";
import { v4 as uuidv4 } from 'uuid'; 
import pLimit from 'p-limit'; // Import p-limit for concurrency control

// Define the interface matching the 'chunks' table schema
interface ChunkDoc {
  projectId: Id<"projects">;
  uniqueChunkId: string;
  pageContent: string;
  metadata?: {
    docAuthor?: string;
    docTitle?: string;
    headings?: string[];
    pageNumber?: number;
    numTokens?: number;
    snippet?: string;
    module?: string; // Added 'module' field
  };
  embedding?: number[]; // Ensure embedding is optional
  chunkNumber?: number;
}

// Define the shape of the data to be returned
interface EmbeddingChunk {
  id: string;
  pageContent: string;
  embedding: number[];
  metadata?: {
    snippet: string | null;
    module: string | null;
  };
}

/**
 * Query to fetch a limited number of chunks that have embeddings.
 * Supports pagination by accepting an optional `cursor`.
 */
export const getAllEmbeddings = query(async (
  ctx,
  { limit, cursor }: { limit: number; cursor?: string | null }
): Promise<{ chunks: EmbeddingChunk[]; nextCursor: string | null }> => {
  // Initialize the query using the 'by_uniqueChunkId' index for ordering
  let q = ctx.db.query("chunks")
    .withIndex("by_uniqueChunkId") // Use the specified index
    .order("asc"); // Order by 'uniqueChunkId' in ascending order

  // If a cursor is provided, filter to items after the cursor
  if (cursor) {
    q = q.filter(c => c.gt("uniqueChunkId", cursor)); // Apply filter for cursor-based pagination
  }

  // Filter out chunks without embeddings
  q = q.filter(c => c.neq("embedding", null));

  // Apply the limit
  const chunks = await q.take(limit); // Removed .collect()

  // Determine the next cursor
  const nextCursor = chunks.length === limit ? chunks[chunks.length - 1].uniqueChunkId : null;

  return {
    chunks: chunks.map((chunk: ChunkDoc) => ({
      id: chunk.uniqueChunkId,
      pageContent: chunk.pageContent,
      embedding: chunk.embedding as number[], // Ensure embedding is defined
      metadata: {
        snippet: chunk.metadata?.snippet || 'No snippet available', // Map snippet
        module: chunk.metadata?.module || null, // Ensure 'module' exists in metadata
      },
    })),
    nextCursor,
  };
});

// Mutation to insert a single chunk
export const insertChunk = mutation({
  args: {
    parentProjectId: v.id("projects"),
    pageContent: v.string(),
    metadata: v.optional(v.object({})), // Allow any object
    chunkNumber: v.optional(v.number()), // Optional
  },
  handler: async (
    ctx,
    { parentProjectId, pageContent, metadata, chunkNumber }: {
      parentProjectId: Id<"projects">;
      pageContent: string;
      metadata?: Record<string, any>;
      chunkNumber?: number;
    }
  ) => {
    const uniqueChunkId = uuidv4(); // Generate UUID server-side

    await ctx.db.insert("chunks", {
      projectId: parentProjectId,
      uniqueChunkId, // Use the generated UUID
      pageContent,
      metadata: metadata || {},
      chunkNumber: chunkNumber ?? undefined, // Optional
    });
  },
});

// Mutation to insert multiple chunks (Batch Insert)
export const insertChunks = mutation({
  args: {
    parentProjectId: v.id("projects"),
    chunks: v.array(
      v.object({
        uniqueChunkId: v.string(), // Accept UUID for each chunk
        pageContent: v.string(),
        metadata: v.optional(
          v.object({
            docAuthor: v.optional(v.string()),
            docTitle: v.optional(v.string()),
            headings: v.optional(v.array(v.string())),
            pageNumber: v.optional(v.number()),
            numTokens: v.optional(v.number()),
            snippet: v.optional(v.string()),
            module: v.optional(v.string()), // Added 'module' field
          })
        ),
        embedding: v.optional(v.array(v.float64())), // Ensure embedding is optional
        chunkNumber: v.optional(v.number()),
      })
    ),
  },
  handler: async (
    ctx,
    { parentProjectId, chunks }: {
      parentProjectId: Id<"projects">;
      chunks: {
        uniqueChunkId: string;
        pageContent: string;
        metadata?: {
          docAuthor?: string;
          docTitle?: string;
          headings?: string[];
          pageNumber?: number;
          numTokens?: number;
          snippet?: string;
          module?: string;
        };
        embedding?: number[];
        chunkNumber?: number;
      }[];
    }
  ) => {
    const chunkDocs: ChunkDoc[] = chunks.map(chunk => ({
      projectId: parentProjectId,
      uniqueChunkId: chunk.uniqueChunkId, // Use the provided UUID
      pageContent: chunk.pageContent,
      metadata: chunk.metadata || {},
      embedding: chunk.embedding ?? undefined, // Optional
      chunkNumber: chunk.chunkNumber ?? undefined,
    }));

    // Define concurrency limit (e.g., 5 simultaneous inserts)
    const limit = pLimit(5);

    // Create an array of insert promises with controlled concurrency
    const insertPromises = chunkDocs.map(chunkDoc =>
      limit(() => ctx.db.insert("chunks", chunkDoc))
    );

    // Await all insert operations
    await Promise.all(insertPromises);
  },
});

// Mutation to update a chunk's embedding
export const updateChunkEmbedding = mutation({
  args: {
    uniqueChunkId: v.string(), // Use UUID to identify the chunk
    embedding: v.array(v.float64()),
  },
  handler: async (
    ctx,
    { uniqueChunkId, embedding }: {
      uniqueChunkId: string;
      embedding: number[];
    }
  ) => {
    const chunk = await ctx.db.query("chunks")
      .withIndex("by_uniqueChunkId", (q: any) =>
        q.eq("uniqueChunkId", uniqueChunkId)
      )
      .first();

    if (!chunk) {
      throw new Error(`Chunk with unique ID ${uniqueChunkId} not found.`);
    }

    await ctx.db.patch(chunk._id, {
      embedding,
    });
  },
});