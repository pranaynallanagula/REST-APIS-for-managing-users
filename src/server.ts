import 'dotenv/config';
import { createApp } from './app';
import { AppDataSource } from './config/data-source';

const PORT = process.env.PORT || 3000;

AppDataSource.initialize()
  .then(() => {
    const app = createApp(AppDataSource);
    app.listen(PORT, () => {
      // eslint-disable-next-line no-console
      console.log(`Server listening on port ${PORT}`);
    });
  })
  .catch((err) => {
    // eslint-disable-next-line no-console
    console.error('Failed to initialize data source', err);
    process.exit(1);
  });
