import 'dotenv/config';
import express from 'express';

const app = express();
app.use(express.json());

app.get('/', (req, res) => {
  res.json({
    project: 'hedera-tools',
    track: 'Sustainability',
    hackathon: 'Hedera Hello Future Apex 2026',
    status: 'running',
  });
});

// Routes will be imported here
// import tokenRoutes from './routes/token.js';
// import topicRoutes from './routes/topic.js';
// app.use('/api/token', tokenRoutes);
// app.use('/api/topic', topicRoutes);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🌿 hedera-tools running on port ${PORT}`);
  console.log(`   Network: ${process.env.HEDERA_NETWORK || 'testnet'}`);
});
