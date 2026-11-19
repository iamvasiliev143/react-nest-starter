import { writeFile } from 'node:fs/promises';
import { createApp } from '../dist/create-app.js';
import { createOpenApiDocument } from '../dist/swagger.js';

const app = await createApp({ docs: false });
try {
  const document = createOpenApiDocument(app);
  await writeFile(
    new URL('../openapi.json', import.meta.url),
    JSON.stringify(document, null, 2) + '\n',
  );
} finally {
  await app.close();
}
