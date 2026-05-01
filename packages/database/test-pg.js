const pg = require('pg');
const pool = new pg.Pool({ connectionString: 'postgresql://postgres:edyWYlQlIU9L0Nq8LhkT@database-1.c7kawacc2002.ap-southeast-2.rds.amazonaws.com:5432/akn_db?sslmode=no-verify' });
pool.connect()
  .then(client => {
    console.log('Connected!');
    client.release();
    process.exit(0);
  })
  .catch(err => {
    console.error('Connection error', err.message);
    process.exit(1);
  });
