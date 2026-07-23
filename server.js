require('dotenv').config();
const express = require('express');
const multer = require('multer');
const { Octokit } = require('@octokit/rest');
const crypto = require('crypto');

const app = express();
const upload = multer({ storage: multer.memoryStorage() });

const octokit = new Octokit({ auth: process.env.GITHUB_TOKEN });
const OWNER = process.env.GITHUB_OWNER;
const REPO = process.env.GITHUB_REPO;

const EXPIRATION_MS = 60 * 60 * 1000; // 1 hora

app.use(express.static('public'));
app.use(express.json());

// Gera um código curto e fácil de compartilhar (ex: X7K9P2)
function generateCode() {
  return crypto.randomBytes(4).toString('hex').toUpperCase().slice(0, 6);
}

// ---------- UPLOAD ----------
app.post('/upload', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'Nenhum arquivo enviado.' });

    const code = generateCode();

    // 1. Cria a release usando o código como tag
    const release = await octokit.repos.createRelease({
      owner: OWNER,
      repo: REPO,
      tag_name: code,
      name: `Transfer ${code}`,
      body: `Arquivo temporário. Expira em 1 hora (${new Date(Date.now() + EXPIRATION_MS).toISOString()}).`,
      draft: false,
      prerelease: true,
    });

    // 2. Sobe o arquivo como asset da release
    await octokit.repos.uploadReleaseAsset({
      owner: OWNER,
      repo: REPO,
      release_id: release.data.id,
      name: req.file.originalname,
      data: req.file.buffer,
      headers: {
        'content-type': req.file.mimetype || 'application/octet-stream',
        'content-length': req.file.buffer.length,
      },
    });

    res.json({ code, expiresInMinutes: 60 });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Falha ao enviar o arquivo.' });
  }
});

// ---------- DOWNLOAD (consulta pelo código) ----------
app.get('/download/:code', async (req, res) => {
  try {
    const code = req.params.code.toUpperCase();

    const release = await octokit.repos.getReleaseByTag({
      owner: OWNER,
      repo: REPO,
      tag: code,
    });

    const asset = release.data.assets[0];
    if (!asset) return res.status(404).json({ error: 'Arquivo não encontrado ou já expirado.' });

    res.json({
      filename: asset.name,
      size: asset.size,
      downloadUrl: asset.browser_download_url,
    });
  } catch (err) {
    if (err.status === 404) {
      return res.status(404).json({ error: 'Código inválido ou arquivo já expirado.' });
    }
    console.error(err);
    res.status(500).json({ error: 'Erro ao buscar o arquivo.' });
  }
});

// ---------- LIMPEZA AUTOMÁTICA (roda a cada 5 minutos) ----------
async function cleanupExpiredReleases() {
  try {
    const releases = await octokit.repos.listReleases({ owner: OWNER, repo: REPO });

    for (const release of releases.data) {
      const createdAt = new Date(release.created_at).getTime();
      const age = Date.now() - createdAt;

      if (age > EXPIRATION_MS) {
        await octokit.repos.deleteRelease({
          owner: OWNER,
          repo: REPO,
          release_id: release.id,
        });
        // Apaga também a tag do Git associada
        await octokit.git.deleteRef({
          owner: OWNER,
          repo: REPO,
          ref: `tags/${release.tag_name}`,
        }).catch(() => {}); // ignora se a tag já não existir

        console.log(`Release ${release.tag_name} expirada e removida.`);
      }
    }
  } catch (err) {
    console.error('Erro na limpeza automática:', err.message);
  }
}

setInterval(cleanupExpiredReleases, 5 * 60 * 1000); // checa a cada 5 minutos
cleanupExpiredReleases(); // roda uma vez ao iniciar

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Servidor rodando em http://localhost:${PORT}`));
