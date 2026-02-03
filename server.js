#!/usr/bin/env node
import { spawn } from 'child_process';
import { writeFileSync, mkdirSync, existsSync, chmodSync } from 'fs';
import { join } from 'path';
import express from 'express';

// ════════════════════════════════════════════════════════════════
// 🦞 OpenClaw Railway Fixed Deployer
// ════════════════════════════════════════════════════════════════

const PORT = process.env.PORT || 8080;
const HOME = process.env.HOME || '/root';
const CONFIG_DIR = join(HOME, '.clawdbot');
const CONFIG_FILE = join(CONFIG_DIR, 'clawdbot.json');

// المفاتيح
const TELEGRAM_TOKEN = process.env.TELEGRAM_BOT_TOKEN || '8050829548:AAGaq5svCDMSd5LZhSwqt8Ow7fW7C7A1jbY';
const ANTHROPIC_KEY = process.env.ANTHROPIC_API_KEY || 'sk-ant-api03-_Y6ga8zhWswfKswq1o4_90Xxz11t04JycSX0bur_fKndlnpgy6hfU31_TvSMh8hD56xSVMhZD8mVE14FvAKBXg-hxn20gAA';

console.log('🚀 Starting OpenClaw Fixed Deployer...\n');

// ════════════════════════════════════════════════════════════════
// إعداد التكوين المتوافق مع الإصدار الجديد
// ════════════════════════════════════════════════════════════════

function setupConfig() {
  console.log('📝 Preparing Compatible Configuration...');
  
  if (!existsSync(CONFIG_DIR)) {
    mkdirSync(CONFIG_DIR, { recursive: true });
  }

  // هيكل إعدادات مبسط ومتوافق لتجنب أخطاء التحقق (Validation Errors)
  const config = {
    agents: {
      defaults: {
        model: {
          primary: "anthropic/claude-sonnet-4-20250514"
        },
        models: {
          "anthropic/claude-sonnet-4-20250514": "anthropic:claude-3-5-sonnet-20240620"
        },
        workspace: "/tmp/openclaw-workspace",
        sandbox: {
          mode: "off"
        }
      }
    },
    gateway: {
      mode: "local", // ضروري جداً لتجنب توقف البوت
      port: parseInt(PORT) + 1
    },
    channels: {
      telegram: {
        enabled: true,
        botToken: TELEGRAM_TOKEN,
        allowFrom: ["*"]
      }
    }
  };

  writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2));
  
  // إصلاح أذونات الملفات كما طلبت سجلات Railway
  try {
    chmodSync(CONFIG_DIR, 0o700);
    chmodSync(CONFIG_FILE, 0o600);
    
    // إنشاء المجلدات المفقودة التي سببت أخطاء حرجة
    const sessionDir = join(CONFIG_DIR, 'agents/main/sessions');
    const credsDir = join(CONFIG_DIR, 'credentials');
    mkdirSync(sessionDir, { recursive: true });
    mkdirSync(credsDir, { recursive: true });
    chmodSync(sessionDir, 0o700);
    chmodSync(credsDir, 0o700);
  } catch (e) {
    console.log('⚠️ Note: Could not set some permissions, continuing...');
  }

  console.log('✅ Config saved and permissions fixed.');
}

// ════════════════════════════════════════════════════════════════
// تشغيل البوابة (Gateway)
// ════════════════════════════════════════════════════════════════

function startGateway() {
  console.log('📡 Launching OpenClaw Gateway...');
  
  // تشغيل البوابة مباشرة مع زيادة الذاكرة لتجنب Heap Limit Error
  const gateway = spawn('node', [
    '--max-old-space-size=1024', // زيادة الذاكرة لـ 1 جيجا
    'node_modules/.bin/clawdbot', 
    'gateway', 
    '--verbose'
  ], {
    stdio: 'inherit',
    env: {
      ...process.env,
      ANTHROPIC_API_KEY: ANTHROPIC_KEY,
      TELEGRAM_BOT_TOKEN: TELEGRAM_TOKEN,
      PORT: (parseInt(PORT) + 1).toString(),
      HOME,
      NODE_OPTIONS: '--max-old-space-size=1024'
    }
  });

  gateway.on('exit', (code) => {
    console.log(`⚠️ Gateway exited (Code: ${code}). Restarting in 10s...`);
    setTimeout(() => startGateway(), 10000);
  });
}

// ════════════════════════════════════════════════════════════════
// خادم الصحة (Health Server)
// ════════════════════════════════════════════════════════════════

function startHealthServer() {
  const app = express();
  app.get('/health', (req, res) => res.json({ status: 'ok' }));
  app.get('/', (req, res) => res.send('OpenClaw Active'));
  
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`💚 Health server online on port ${PORT}`);
  });
}

// ════════════════════════════════════════════════════════════════
// Main
// ════════════════════════════════════════════════════════════════

async function main() {
  setupConfig();
  startHealthServer();
  await new Promise(r => setTimeout(r, 3000));
  startGateway();
}

main().catch(err => console.error('❌ Fatal:', err));
