#!/usr/bin/env node
import { spawn } from 'child_process';
import { writeFileSync, mkdirSync, existsSync } from 'fs';
import { join } from 'path';
import express from 'express';

// ════════════════════════════════════════════════════════════════
// 🦞 OpenClaw Auto-Deployer for Railway
// ════════════════════════════════════════════════════════════════

const PORT = process.env.PORT || 8080;
const HOME = process.env.HOME || '/root';
const CONFIG_DIR = join(HOME, '.clawdbot');
const CONFIG_FILE = join(CONFIG_DIR, 'clawdbot.json');

// المفاتيح (من المتغيرات البيئية أو قيم افتراضية)
const TELEGRAM_TOKEN = process.env.TELEGRAM_BOT_TOKEN || '8050829548:AAGaq5svCDMSd5LZhSwqt8Ow7fW7C7A1jbY';
const ANTHROPIC_KEY = process.env.ANTHROPIC_API_KEY || 'sk-ant-api03-_Y6ga8zhWswfKswq1o4_90Xxz11t04JycSX0bur_fKndlnpgy6hfU31_TvSMh8hD56xSVMhZD8mVE14FvAKBXg-hxn20gAA';

console.log('🦞 OpenClaw Railway Auto-Deployer Starting...\n');

// ════════════════════════════════════════════════════════════════
// إنشاء الإعدادات تلقائياً
// ════════════════════════════════════════════════════════════════

function setupConfig() {
  console.log('📝 Creating OpenClaw configuration...');
  
  if (!existsSync(CONFIG_DIR)) {
    mkdirSync(CONFIG_DIR, { recursive: true });
  }

  // تم تحديث الهيكل ليتوافق تماماً مع أحدث إصدار من clawdbot بناءً على سجلات الخطأ
  const config = {
    agents: {
      defaults: {
        model: {
          primary: "anthropic/claude-sonnet-4-20250514",
          fallbacks: []
        },
        models: {
          "anthropic/claude-sonnet-4-20250514": {
            provider: "anthropic",
            model: "claude-3-5-sonnet-20240620"
          }
        },
        workspace: "/tmp/openclaw-workspace",
        sandbox: {
          mode: "off"
        }
      }
    },
    gateway: {
      port: parseInt(PORT) + 1,
      auth: {
        mode: "password",
        password: process.env.GATEWAY_PASSWORD || "openclaw123",
        allowTailscale: false
      },
      tailscale: {
        mode: "off"
      }
    },
    channels: {
      telegram: {
        botToken: TELEGRAM_TOKEN,
        allowFrom: ["*"],
        groups: {
          "*": {
            enabled: true,
            requireMention: false
          }
        }
      }
    },
    browser: {
      enabled: true,
      headless: true,
      color: "#FF4500"
    }
  };

  writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2));
  console.log('✅ Configuration created at:', CONFIG_FILE);
  console.log('');
}

// ════════════════════════════════════════════════════════════════
// إنشاء ملف .env
// ════════════════════════════════════════════════════════════════

function setupEnv() {
  console.log('📝 Creating environment file...');
  
  const envContent = `ANTHROPIC_API_KEY=${ANTHROPIC_KEY}
TELEGRAM_BOT_TOKEN=${TELEGRAM_TOKEN}
PORT=${PORT}
NODE_ENV=production
`;

  writeFileSync(join(process.cwd(), '.env'), envContent);
  console.log('✅ Environment file created');
  console.log('');
}

// ════════════════════════════════════════════════════════════════
// بدء Gateway
// ════════════════════════════════════════════════════════════════

function startGateway() {
  console.log('🚀 Starting OpenClaw Gateway...\n');
  
  // استخدام clawdbot doctor --fix أولاً لضمان سلامة الإعدادات
  console.log('🩺 Running clawdbot doctor --fix...');
  const doctor = spawn('npx', ['clawdbot', 'doctor', '--fix'], {
    stdio: 'inherit',
    env: { ...process.env, HOME }
  });

  doctor.on('exit', () => {
    console.log('═══════════════════════════════════════════════════');
    console.log('🦞 OpenClaw is LIVE!');
    console.log('═══════════════════════════════════════════════════');
    console.log(`📍 Port: ${PORT}`);
    console.log(`🤖 Telegram Bot: Active`);
    console.log(`🧠 AI Model: Claude Sonnet 4`);
    console.log('═══════════════════════════════════════════════════\n');

    const gateway = spawn('npx', ['clawdbot', 'gateway', '--verbose'], {
      stdio: 'inherit',
      env: {
        ...process.env,
        ANTHROPIC_API_KEY: ANTHROPIC_KEY,
        TELEGRAM_BOT_TOKEN: TELEGRAM_TOKEN,
        PORT: (parseInt(PORT) + 1).toString(),
        HOME
      }
    });

    gateway.on('error', (error) => {
      console.error('❌ Gateway error:', error);
      process.exit(1);
    });

    gateway.on('exit', (code) => {
      console.log(`⚠️ Gateway exited with code ${code}`);
      if (code !== 0) {
        console.log('🔄 Restarting in 5 seconds...');
        setTimeout(() => startGateway(), 5000);
      }
    });
  });
}

// ════════════════════════════════════════════════════════════════
// Web Server للـ Health Check
// ════════════════════════════════════════════════════════════════

function startHealthServer() {
  const app = express();
  
  app.get('/', (req, res) => {
    res.send(`
<!DOCTYPE html>
<html dir="rtl" lang="ar">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>🦞 OpenClaw Active</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 20px;
    }
    .container {
      background: rgba(255, 255, 255, 0.1);
      backdrop-filter: blur(10px);
      border-radius: 20px;
      padding: 40px;
      max-width: 600px;
      text-align: center;
      box-shadow: 0 8px 32px 0 rgba(31, 38, 135, 0.37);
      border: 1px solid rgba(255, 255, 255, 0.18);
    }
    h1 { font-size: 3em; margin-bottom: 20px; }
    .status { 
      background: rgba(76, 175, 80, 0.3);
      padding: 15px 30px;
      border-radius: 50px;
      display: inline-block;
      margin: 20px 0;
      font-size: 1.2em;
      font-weight: bold;
    }
    .info {
      background: rgba(255, 255, 255, 0.1);
      border-radius: 10px;
      padding: 20px;
      margin: 20px 0;
      text-align: right;
    }
    .info-item {
      margin: 10px 0;
      padding: 10px;
      border-bottom: 1px solid rgba(255, 255, 255, 0.1);
    }
    .info-item:last-child { border-bottom: none; }
    .label { 
      font-weight: bold;
      color: #FFD700;
      margin-left: 10px;
    }
    .pulse {
      animation: pulse 2s infinite;
    }
    @keyframes pulse {
      0%, 100% { opacity: 1; }
      50% { opacity: 0.5; }
    }
  </style>
</head>
<body>
  <div class="container">
    <h1>🦞</h1>
    <h2>OpenClaw</h2>
    <div class="status pulse">✅ شغال ونشط</div>
    
    <div class="info">
      <div class="info-item">
        <span class="label">🤖 البوت:</span>
        <span>@Liuszc1s2_bot</span>
      </div>
      <div class="info-item">
        <span class="label">🧠 الموديل:</span>
        <span>Claude Sonnet 4</span>
      </div>
      <div class="info-item">
        <span class="label">📡 البورت:</span>
        <span>${PORT}</span>
      </div>
      <div class="info-item">
        <span class="label">⏰ الوقت:</span>
        <span>${new Date().toLocaleString('ar-EG')}</span>
      </div>
    </div>

    <p style="margin-top: 30px; opacity: 0.8;">
      افتح تليجرام وابحث عن البوت وابدأ المحادثة! 🚀
    </p>
  </div>
</body>
</html>
    `);
  });

  app.get('/health', (req, res) => {
    res.json({ 
      status: 'ok', 
      service: 'OpenClaw Gateway',
      timestamp: new Date().toISOString()
    });
  });

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`💚 Health server running on port ${PORT}`);
  });
}

// ════════════════════════════════════════════════════════════════
// Main
// ════════════════════════════════════════════════════════════════

async function main() {
  try {
    console.log('');
    console.log('╔═══════════════════════════════════════════════════╗');
    console.log('║    🦞 OpenClaw - ALL FEATURES ENABLED 🦞         ║');
    console.log('╚═══════════════════════════════════════════════════╝');
    console.log('');
    
    // 1. إنشاء الإعدادات
    setupConfig();
    setupEnv();

    // 2. بدء Health Server
    startHealthServer();

    // 3. الانتظار قليلاً
    await new Promise(resolve => setTimeout(resolve, 2000));

    // 4. بدء Gateway
    startGateway();

  } catch (error) {
    console.error('❌ Fatal error:', error);
    process.exit(1);
  }
}

// Signal handlers
process.on('SIGTERM', () => {
  console.log('\n🛑 Received SIGTERM, shutting down gracefully...');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('\n🛑 Received SIGINT, shutting down gracefully...');
  process.exit(0);
});

// Start!
main();
