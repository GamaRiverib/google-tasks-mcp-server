# Google Tasks MCP Server

Este proyecto implementa un servidor MCP (Model Context Protocol) que expone herramientas para interactuar con la API de Google Tasks. Permite listar, crear, actualizar, eliminar y buscar listas y tareas de Google Tasks mediante herramientas MCP, facilitando su integración con asistentes, agentes o flujos automatizados compatibles con MCP.

## Características principales

- Autenticación OAuth2 con Google Tasks.
- Listado, creación, actualización y eliminación de listas de tareas.
- Listado, búsqueda, creación, actualización, finalización, reapertura y eliminación de tareas.
- Transporte por stdio para integración sencilla en pipelines o agentes MCP.
- Configuración de límites de resultados mediante la variable de entorno `MAX_TASK_RESULTS`.

## Requisitos

- Node.js
- Una cuenta de Google Cloud Platform con la API de Google Tasks habilitada.
- Credenciales OAuth2 descargadas como `credentials.json`.

## Instalación y uso

1. **Instala las dependencias:**
   ```bash
   npm install
   ```

2. **Coloca tus credenciales OAuth2 en `credentials.json` en la raíz del proyecto.**

3. **Compila el código TypeScript:**
   ```bash
   npx tsc
   ```

4. **Ejecuta el servidor MCP:**
   ```bash
   node build/index.js
   ```

   La primera vez, se abrirá un flujo de autenticación en el navegador para autorizar el acceso a tu cuenta de Google Tasks.

5. **Integración:**
   - El servidor MCP se comunica por stdio y expone herramientas como `list-task-lists`, `create-task`, `update-task`, `delete-task`, entre otras, para ser utilizadas por clientes MCP.

## Ejemplo de configuración en Claude Desktop

Para integrar este servidor MCP en Claude Desktop, agrega una entrada en tu archivo `claude_desktop_config.json` (o en la sección correspondiente de configuración) como el siguiente ejemplo. Asegúrate de ajustar `{RUTA}` a la ubicación real de tu proyecto:

```json
{
  "mcp_servers": [
    {
      "id": "google-tasks",
      "name": "Google Tasks MCP Server",
      "description": "Servidor MCP para gestionar Google Tasks mediante herramientas MCP.",
      "command": "node",
      "args": [
        "{RUTA}/google-tasks/build/index.js"
      ],
      "env": {
        "MAX_TASK_RESULTS": "100"
      }
    }
  ]
}
```

- Reemplaza `{RUTA}` por la ruta absoluta donde se encuentra tu proyecto, por ejemplo: `D:/Projects/mcp-servers`.
- Si usas `npx`, puedes cambiar `"command"` y `"args"` así:
  ```json
  "command": "npx",
  "args": [
    "@gamariverib/google-tasks"
  ]
  ```

Esto permitirá que Claude Desktop detecte y utilice el servidor MCP de Google Tasks correctamente.

## Notas

- El archivo `token.json` se genera automáticamente tras la autenticación y almacena el token de acceso y refresco.
- Consulta el código fuente en [`src/index.ts`](src/index.ts) para ver la definición de cada herramienta y su uso detallado.