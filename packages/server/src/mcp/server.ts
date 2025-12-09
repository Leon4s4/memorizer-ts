import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import { injectable, singleton } from 'tsyringe';
import { StorageService } from '../services/storage.js';
import { MemoryTools } from './tools.js';

/**
 * MCP Server for Memorizer
 *
 * Provides Model Context Protocol tools for LLMs to interact with memory storage.
 * Supports storing, searching, editing, and managing memories with versioning.
 */
@singleton()
@injectable()
export class McpServer {
  private server: Server;
  private tools: MemoryTools;

  constructor(
    private storage: StorageService
  ) {
    this.server = new Server(
      {
        name: 'memorizer',
        version: '2.0.0',
      },
      {
        capabilities: {
          tools: {},
        },
      }
    );

    this.tools = new MemoryTools(storage);
    this.setupHandlers();
  }

  private setupHandlers(): void {
    // List available tools
    this.server.setRequestHandler(ListToolsRequestSchema, async () => ({
      tools: this.tools.getToolDefinitions(),
    }));

    // Handle tool calls
    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;

      try {
        const result = await this.tools.executeTool(name, args || {});
        return {
          content: [
            {
              type: 'text',
              text: result,
            },
          ],
        };
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
        return {
          content: [
            {
              type: 'text',
              text: `Error executing tool '${name}': ${errorMessage}`,
            },
          ],
          isError: true,
        };
      }
    });

    // Error handler
    this.server.onerror = (error) => {
      console.error('[MCP Server Error]', error);
    };

    // Close handler
    process.on('SIGINT', async () => {
      await this.server.close();
      process.exit(0);
    });
  }

  /**
   * Start the MCP server with stdio transport
   */
  async start(): Promise<void> {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);

    // MCP server is now running and listening for requests over stdio
    console.error('[MCP Server] Started and listening for requests');
  }

  /**
   * Close the MCP server
   */
  async close(): Promise<void> {
    await this.server.close();
  }
}
