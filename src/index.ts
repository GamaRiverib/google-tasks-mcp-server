#!/usr/bin/env node

import fs from "fs";
import path from "path";
import process from "process";

import { authenticate } from "@google-cloud/local-auth";

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import z from "zod";

import { google } from "googleapis";
import { OAuth2Client } from "google-auth-library";

// If modifying these scopes, delete token.json.
const SCOPES = ["https://www.googleapis.com/auth/tasks"];
// The file token.json stores the user's access and refresh tokens, and is
// created automatically when the authorization flow completes for the first
// time.
let __dirname = path.dirname(new URL(import.meta.url).pathname);
if (process.platform === "win32" && __dirname.startsWith("/")) {
  __dirname = __dirname.slice(1);
}
const TOKEN_PATH = path.join(__dirname, "../token.json");
const CREDENTIALS_PATH = path.join(__dirname, "../credentials.json");

const MAX_TASK_RESULTS = parseInt(process.env.MAX_TASK_RESULTS || "100");
const maxResults = MAX_TASK_RESULTS < 10 ? 10 : MAX_TASK_RESULTS > 2000 ? 2000 : MAX_TASK_RESULTS;

// Create server instance
const server = new McpServer({
  name: "gamariverib/google-tasks",
  version: "0.1.0",
  capabilities: {
    resources: {},
    tools: {},
  },
});

// Register a tool "list-task-lists"
server.registerTool(
  "list-task-lists",
  {
    title: "List Task Lists",
    description: "List all task lists in Google Tasks",
  },
  async () => {
    try {
      const auth = await authorize();
      const tasks = google.tasks({ version: "v1", auth });
      const response = await tasks.tasklists.list({
        maxResults,
      }); // List task lists with a maximum number of results
      const taskLists = response.data.items || [];
      return {
        content: [
          {
            type: "text",
            text: `Task Lists:\n${JSON.stringify(taskLists, null, 2)}`,
          },
        ],
        isError: false,
      };
    } catch (error: any) {
      console.error("Error in list-task-lists tool:", error);
      return {
        content: [{ type: "text", text: `Error listing task lists: ${error.message}` }],
        isError: true,
      };
    }
  }
);

// Register a tool "create-task-list"
server.registerTool(
  "create-task-list",
  {
    title: "Create Task List",
    description: "Create a new task list in Google Tasks",
    inputSchema: {
      taskTitle: z.string().describe("Title of the new task list"),
    },
  },
  async ({ taskTitle }) => {
    try {
      const auth = await authorize();
      const tasks = google.tasks({ version: "v1", auth });
      const response = await tasks.tasklists.insert({
        requestBody: {
          title: taskTitle,
        },
      });
      const taskList = response.data;
      return {
        content: [
          {
            type: "text",
            text: `Task List created successfully:\n${JSON.stringify(taskList, null, 2)}`,
          },
        ],
        isError: false,
      };
    } catch (error: any) {
      console.error("Error in create-task-list tool:", error);
      return {
        content: [
          {
            type: "text",
            text: `Error creating task list: ${error.message}`,
          },
        ],
        isError: true,
      };
    }
  }
);

// Register a tool "update-task-list"
server.registerTool(
  "update-task-list",
  {
    title: "Update Task List",
    description: "Update an existing task list in Google Tasks",
    inputSchema: {
      taskListId: z.string().describe("ID of the task list to update"),
      taskListTitle: z.string().describe("New title for the task list"),
    },
  },
  async ({ taskListId, taskListTitle }) => {
    try {
      const auth = await authorize();
      const tasks = google.tasks({ version: "v1", auth });
      const response = await tasks.tasklists.update({
        tasklist: taskListId,
        requestBody: {
          title: taskListTitle,
        },
      });
      const updatedTaskList = response.data;
      return {
        content: [
          {
            type: "text",
            text: `Task List updated successfully:\n${JSON.stringify(updatedTaskList, null, 2)}`,
          },
        ],
        isError: false,
      };
    } catch (error: any) {
      console.error("Error in update-task-list tool:", error);
      return {
        content: [
          {
            type: "text",
            text: `Error updating task list: ${error.message}`,
          },
        ],
        isError: true,
      };
    }
  }
);

// Register a tool "delete-task-list"
server.registerTool(
  "delete-task-list",
  {
    title: "Delete Task List",
    description: "Delete a task list in Google Tasks",
    inputSchema: {
      taskListId: z.string().describe("ID of the task list to delete"),
    },
  },
  async ({ taskListId }) => {
    try {
      const auth = await authorize();
      const tasks = google.tasks({ version: "v1", auth });
      await tasks.tasklists.delete({
        tasklist: taskListId,
      });
      return {
        content: [
          {
            type: "text",
            text: `Task List with ID ${taskListId} deleted successfully.`,
          },
        ],
        isError: false,
      };
    } catch (error: any) {
      console.error("Error in delete-task-list tool:", error);
      return {
        content: [
          {
            type: "text",
            text: `Error deleting task list: ${error.message}`,
          },
        ],
        isError: true,
      };
    }
  }
);

// Register a tool "list-tasks"
server.registerTool(
  "list-tasks",
  {
    title: "List Tasks",
    description: "List tasks in a specific task list",
    inputSchema: {
      taskListId: z.string().describe("ID of the task list to list tasks from"),
    },
  },
  async ({ taskListId }) => {
    try {
      const auth = await authorize();
      const tasks = google.tasks({ version: "v1", auth });
      const response = await tasks.tasks.list({
        maxResults,
        tasklist: taskListId,
      });
      const tasksList = response.data.items || [];
      return {
        content: [
          {
            type: "text",
            text: `Tasks in Task List ID ${taskListId}:\n${JSON.stringify(tasksList, null, 2)}`,
          },
        ],
        isError: false,
      };
    } catch (error: any) {
      console.error("Error in list-tasks tool:", error);
      return {
        content: [
          {
            type: "text",
            text: `Error listing tasks: ${error.message}`,
          },
        ],
        isError: true,
      };
    }
  }
);

// Register a tool "search-tasks"
server.registerTool(
  "search-tasks",
  {
    title: "Search Tasks",
    description: "Search for tasks in Google Tasks",
    inputSchema: {
      taskListId: z.string().describe("ID of the task list to search in"),
      query: z.string().describe("Search query for tasks"),
    },
  },
  async ({ taskListId, query }) => {
    try {
      const auth = await authorize();
      const tasks = google.tasks({ version: "v1", auth });
      const response = await tasks.tasks.list({
        maxResults,
        tasklist: taskListId,
      });

      const taskLists = response.data.items || [];
      const filteredTasks = taskLists.filter(
        (task) =>
          task.title?.toLowerCase().includes(query.toLowerCase()) ||
          task.notes?.toLowerCase().includes(query.toLowerCase())
      );

      return {
        content: [
          {
            type: "text",
            text: `Search results for "${query}":\n${JSON.stringify(filteredTasks, null, 2)}`,
          },
        ],
        isError: false,
      };
    } catch (error: any) {
      console.error("Error in search-tasks tool:", error);
      return {
        content: [
          {
            type: "text",
            text: `Error searching tasks: ${error.message}`,
          },
        ],
        isError: true,
      };
    }
  }
);

// Register a tool "create-task"
server.registerTool(
  "create-task",
  {
    title: "Create Task",
    description: "Create a new task in a specific task list",
    inputSchema: {
      taskListId: z.string().describe("ID of the task list to create the task in"),
      taskTitle: z.string().describe("Title of the new task"),
      taskNotes: z.string().describe("Notes for the new task").optional(),
      taskDue: z.string().describe("Due date for the new task in ISO format (YYYY-MM-DD)").optional(),
      taskStatus: z.string().describe("Status of the new task (needsAction or completed)").optional().default("needsAction"),
      taskParent: z.string().describe("ID of the parent task if this is a subtask").optional(),
    },
  },
  async ({ taskListId, taskTitle, taskNotes, taskDue, taskStatus, taskParent }) => {
    try {
      const auth = await authorize();
      const tasks = google.tasks({ version: "v1", auth });
      const response = await tasks.tasks.insert({
        tasklist: taskListId,
        requestBody: {
          title: taskTitle,
          notes: taskNotes,
          due: taskDue ? new Date(taskDue).toISOString() : undefined,
          status: taskStatus || "needsAction",
          parent: taskParent, // Optional: if this is a subtask
        },
      });
      const newTask = response.data;
      return {
        content: [
          {
            type: "text",
            text: `Task created successfully:\n${JSON.stringify(newTask, null, 2)}`,
          },
        ],
        isError: false,
      };
    } catch (error: any) {
      console.error("Error in create-task tool:", error);
      return {
        content: [
          {
            type: "text",
            text: `Error creating task: ${error.message}`,
          },
        ],
        isError: true,
      };
    }
  }
);

// Register a tool "get-task"
server.registerTool(
  "get-task",
  {
    title: "Get Task",
    description: "Get details of a specific task from a task list",
    inputSchema: {
      taskListId: z.string().describe("ID of the task list containing the task"),
      taskId: z.string().describe("ID of the task to retrieve"),
    },
  },
  async ({ taskListId, taskId }) => {
    try {
      const auth = await authorize();
      const tasks = google.tasks({ version: "v1", auth });
      const response = await tasks.tasks.get({
        tasklist: taskListId,
        task: taskId,
      });
      const task = response.data;
      return {
        content: [
          {
            type: "text",
            text: `Task details:\n${JSON.stringify(task, null, 2)}`,
          },
        ],
        isError: false,
      };
    } catch (error: any) {
      console.error("Error in get-task tool:", error);
      return {
        content: [
          {
            type: "text",
            text: `Error retrieving task: ${error.message}`,
          },
        ],
        isError: true,
      };
    }
  }
);

// Register a tool "update-task"
server.registerTool(
  "update-task",
  {
    title: "Update Task",
    description: "Update an existing task in a specific task list",
    inputSchema: {
      taskListId: z.string().describe("ID of the task list containing the task to update"),
      taskId: z.string().describe("ID of the task to update"),
      taskTitle: z.string().describe("New title for the task"),
      taskNotes: z.string().describe("New notes for the task").optional(),
      taskDue: z.string().describe("New due date for the task in ISO format (YYYY-MM-DD)").optional(),
      taskParent: z.string().describe("ID of the parent task if this is a subtask").optional(),
    },
  },
  async ({ taskListId, taskId, taskTitle, taskNotes, taskDue, taskParent }) => {
    try {
      const auth = await authorize();
      const tasks = google.tasks({ version: "v1", auth });
      const response = await tasks.tasks.update({
        tasklist: taskListId,
        task: taskId,
        requestBody: {
          title: taskTitle,
          notes: taskNotes,
          due: taskDue ? new Date(taskDue).toISOString() : undefined,
          parent: taskParent, // Optional: if this is a subtask
        },
      });
      const updatedTask = response.data;

      return {
        content: [
          {
            type: "text",
            text: `Task updated successfully:\n${JSON.stringify(updatedTask, null, 2)}`,
          },
        ],
        isError: false,
      };
    } catch (error: any) {
      console.error("Error in update-task tool:", error);
      return {
        content: [
          {
            type: "text",
            text: `Error updating task: ${error.message}`,
          },
        ],
        isError: true,
      };
    }
  }
);

// Register a tool "delete-task"
server.registerTool(
  "delete-task",
  {
    title: "Delete Task",
    description: "Delete a task from a specific task list",
    inputSchema: {
      taskListId: z.string().describe("ID of the task list containing the task to delete"),
      taskId: z.string().describe("ID of the task to delete"),
    },
  },
  async ({ taskListId, taskId }) => {
    try {
      const auth = await authorize();
      const tasks = google.tasks({ version: "v1", auth });
      await tasks.tasks.delete({
        tasklist: taskListId,
        task: taskId,
      });
      return {
        content: [
          {
            type: "text",
            text: `Task with ID ${taskId} deleted successfully from Task List ID ${taskListId}.`,
          },
        ],
        isError: false,
      };
    } catch (error: any) {
      console.error("Error in delete-task tool:", error);
      return {
        content: [
          {
            type: "text",
            text: `Error deleting task: ${error.message}`,
          },
        ],
        isError: true,
      };
    }
  }
);

// Register a tool "clear-tasks"
server.registerTool(
  "clear-tasks",
  {
    title: "Clear Tasks",
    description: "Clear all tasks from a specific task list",
    inputSchema: {
      taskListId: z.string().describe("ID of the task list to clear tasks from"),
    },
  },
  async ({ taskListId }) => {
    try {
      const auth = await authorize();
      const tasks = google.tasks({ version: "v1", auth });
      await tasks.tasks.clear({
        tasklist: taskListId,
      });
      return {
        content: [
          {
            type: "text",
            text: `All tasks cleared successfully from Task List ID ${taskListId}.`,
          },
        ],
        isError: false,
      };
    } catch (error: any) {
      console.error("Error in clear-tasks tool:", error);
      return {
        content: [
          {
            type: "text",
            text: `Error clearing tasks: ${error.message}`,
          },
        ],
        isError: true,
      };
    }
  }
);

// Register a tool "complete-task"
server.registerTool(
  "complete-task",
  {
    title: "Complete Task",
    description: "Mark a task as completed in a specific task list",
    inputSchema: {
      taskListId: z.string().describe("ID of the task list containing the task to complete"),
      taskId: z.string().describe("ID of the task to mark as completed"),
    },
  },
  async ({ taskListId, taskId }) => {
    try {
      const auth = await authorize();
      const tasks = google.tasks({ version: "v1", auth });
      await tasks.tasks.update({
        tasklist: taskListId,
        task: taskId,
        requestBody: {
          status: "completed",
        },
      });

      return {
        content: [
          {
            type: "text",
            text: `Task with ID ${taskId} marked as completed.`,
          },
        ],
        isError: false,
      };
    } catch (error: any) {
      console.error("Error in complete-task tool:", error);
      return {
        content: [
          {
            type: "text",
            text: `Error completing task: ${error.message}`,
          },
        ],
        isError: true,
      };
    }
  }
);

// Register a tool "reopen-task"
server.registerTool(
  "reopen-task",
  {
    title: "Reopen Task",
    description: "Reopen a completed task in a specific task list",
    inputSchema: {
      taskListId: z.string().describe("ID of the task list containing the task to reopen"),
      taskId: z.string().describe("ID of the task to reopen"),
    },
  },
  async ({ taskListId, taskId }) => {
    try {
      const auth = await authorize();
      const tasks = google.tasks({ version: "v1", auth });
      await tasks.tasks.update({
        tasklist: taskListId,
        task: taskId,
        requestBody: {
          status: "needsAction", // Reopen the task by setting status to needsAction
        },
      });
      return {
        content: [
          {
            type: "text",
            text: `Task with ID ${taskId} reopened successfully.`,
          },
        ],
        isError: false,
      };
    } catch (error: any) {
      console.error("Error in reopen-task tool:", error);
      return {
        content: [
          {
            type: "text",
            text: `Error reopening task: ${error.message}`,
          },
        ],
        isError: true,
      };
    }
  }
);

/**
 * Reads previously authorized credentials from the save file.
 *
 * @return {OAuth2Client|null}
 */
function loadSavedCredentialsIfExist(): OAuth2Client | null {
  try {
    const content = fs.readFileSync(TOKEN_PATH, "utf-8");
    const credentials = JSON.parse(content);
    const { client_id, client_secret, refresh_token } = credentials;
    const client = new OAuth2Client(client_id, client_secret);
    client.setCredentials({ refresh_token });
    return client;
  } catch (err) {
    return null;
  }
}

/**
 * Serializes credentials to a file compatible with GoogleAuth.fromJSON.
 *
 * @param {OAuth2Client} client
 * @return {void}
 */
function saveCredentials(client: OAuth2Client): void {
  const content = fs.readFileSync(CREDENTIALS_PATH, "utf-8");
  const keys = JSON.parse(content);
  const key = keys.installed || keys.web;
  const payload = JSON.stringify({
    type: "authorized_user",
    client_id: key.client_id,
    client_secret: key.client_secret,
    refresh_token: client.credentials.refresh_token,
  });
  fs.writeFileSync(TOKEN_PATH, payload);
}

/**
 * Load or request or authorization to call APIs.
 * @returns {Promise<OAuth2Client>}
 */
async function authorize(): Promise<OAuth2Client> {
  const savedClient = loadSavedCredentialsIfExist();
  if (savedClient) {
    return savedClient;
  }
  const client: any = await authenticate({
    scopes: SCOPES,
    keyfilePath: CREDENTIALS_PATH,
  });
  if (client?.credentials) {
    saveCredentials(client);
  }
  return client;
}

async function main() {
  await authorize();
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("Google Tasks MCP Server running on stdio");
}

main().catch((error) => {
  console.error("Fatal error in main():", error);
  process.exit(1);
});
