import console from 'node:console';
import process from 'node:process';

const authtoken = process.env.NGROK_AUTHTOKEN?.trim();
const domain = process.env.NGROK_DOMAIN?.trim().toLowerCase() ?? '';

if (!authtoken || !/^[a-z0-9-]+(?:\.[a-z0-9-]+)+$/.test(domain)) {
  console.error(
    'Заполни NGROK_AUTHTOKEN и NGROK_DOMAIN в web/.env. Укажи домен без https:// и пути.',
  );
  process.exitCode = 1;
} else {
  try {
    const { default: ngrok } = await import('@ngrok/ngrok');
    const listener = await ngrok.forward({
      addr: '127.0.0.1:5173',
      authtoken,
      domain,
    });
    console.log(`Mini App: ${listener.url()}`);
    process.stdin.resume();
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(
      `Не удалось запустить ngrok: ${message.replaceAll(authtoken, '[скрыто]')}`,
    );
    process.exitCode = 1;
  }
}
