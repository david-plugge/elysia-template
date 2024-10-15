import { env } from './shared/infrastructure/env';
import { app } from './app';

app.listen(
	{
		hostname: env.HOST,
		port: env.PORT,
	},
	(server) => {
		console.log(`Server is running at ${server.url}`);
	},
);
