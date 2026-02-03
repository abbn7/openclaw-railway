#!/usr/bin/env node
import { spawn } from 'child_process';
import { writeFileSync, mkdirSync, existsSync } from 'fs';
import { join } from 'path';
import express from 'express';

// ════════════════════════════════════════════════════════════════
// 🦞 OpenClaw Ultimate Deployer for Railway
// ════════════════════════════════════════════════════════════════

const PORT = process.env.PORT || 8080;
const HOME = process.env.HOME || '/root';
const CONFIG_DIR = join(HOME, '.clawdbot');
const CONFIG_FILE = join(CONFIG_DIR, 'clawdbot.json');

// المفاتيح
const TELEGRAM_TOKEN = process.env.TELEGRAM_BOT_TOKEN || '8050829548:AAGaq5svCDMSd5LZhSwqt8Ow7fW7C7A1jbY';
const ANTHROPIC_KEY = process.env.ANTHROPIC_API_KEY || 'sk-ant-api03-_Y6ga8zhWswfKswq1o4_90Xxz11t04JycSX0bur_fKndlnpgy6hfU31_TvSMh8hD56xSVMhZD8mVE14FvAKBXg-hxn20gAA';

console.log('🚀 Starting OpenClaw Ultimate Deployer...\n');

// ════════════════════════════════════════════════════════════════
// إعداد التكوين الشامل (Full Configuration)
// ════════════════════════════════════════════════════════════════

function setupConfig() {
  console.log('📝 Preparing Full Configuration...');
  
  if (!existsSync(CONFIG_DIR)) {
    mkdirSync(CONFIG_DIR, { recursive: true });
  }

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
          mode: "off" // تعطيل الحماية لإعطاء كامل الصلاحيات
        },
        // تفعيل كافة الأدوات يدوياً لضمان عملها
        tools: {
          bash: { enabled: true, elevated: true },
          browser: { enabled: true },
          canvas: { enabled: true },
          nodes: { enabled: true },
          cron: { enabled: true },
          read: { enabled: true },
          write: { enabled: true },
          edit: { enabled: true },
          process: { enabled: true }
        }
      }
    },
    gateway: {
      port: parseInt(PORT) + 1,
      bind: "0.0.0.0",
      auth: {
        mode: "password",
        password: process.env.GATEWAY_PASSWORD || "openclaw123"
      }
    },
    channels: {
      telegram: {
        enabled: true,
        botToken: TELEGRAM_TOKEN,
        allowFrom: ["*"],
        dm: {
          enabled: true,
          policy: "open",
          allowFrom: ["*"]
        },
        groups: {
          "*": {
            enabled: true,
            requireMention: false,
            activation: "always"
          }
        }
      }
    },
    browser: {
      enabled: true,
      headless: true
    }
  };

  writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2));
  console.log('✅ Config saved to:', CONFIG_FILE);
}

// ════════════════════════════════════════════════════════════════
// تشغيل البوت مع مراقبة دقيقة
// ════════════════════════════════════════════════════════════════

function startGateway() {
  console.log('📡 Launching OpenClaw Gateway...');
  
  // تشغيل doctor للتأكد من عدم وجود أخطاء في الهيكل
  spawn('npx', ['clawdbot', 'doctor', '--fix'], {
    stdio: 'inherit',
    env: { ...process.env, HOME }
  }).on('exit', () => {
    
    // التشغيل الفعلي للبوابة
    const gateway = spawn('npx', ['clawdbot', 'gateway', '--verbose'], {
      stdio: 'inherit',
      env: {
        ...process.env,
        ANTHROPIC_API_KEY: ANTHROPIC_KEY,
        TELEGRAM_BOT_TOKEN: TELEGRAM_TOKEN,
        PORT: (parseInt(PORT) + 1).toString(),
        HOME,
        DEBUG: 'openclaw:*' // تفعيل سجلات التصحيح لرؤية كل شيء
      }
    });

    gateway.on('exit', (code) => {
      console.log(`⚠️ Gateway exited (Code: ${code}). Restarting...`);
      setTimeout(() => startGateway(), 5000);
    });
  });
}

// ════════════════════════════════════════════════════════════════
// خادم الصحة (Health Server)
// ════════════════════════════════════════════════════════════════

function startHealthServer() {
  const app = express();
  app.get('/health', (req, res) => res.json({ status: 'ok', bot: 'active' }));
  app.get('/', (req, res) => res.send('<h1>🦞 OpenClaw is Running!</h1><p>Check your Telegram bot.</p>'));
  
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`💚 Health server online on port ${PORT}`);
  });
}

// ════════════════════════════════════════════════════════════════
// Main Execution
// ════════════════════════════════════════════════════════════════

async function main() {
  setupConfig();
  startHealthServer();
  await new Promise(r => setTimeout(r, 2000));
  startGateway();
}

main().catch(err => console.error('❌ Fatal:', err));
