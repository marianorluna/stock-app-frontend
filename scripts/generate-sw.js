import { readFileSync, writeFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { config } from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Cargar variables de entorno
config({ path: join(__dirname, '../.env') });

const vapidKey = process.env.VITE_VAPID_PUBLIC_KEY || '';

if (!vapidKey) {
    console.warn('⚠️  VITE_VAPID_PUBLIC_KEY no está configurada. El service worker se generará sin clave VAPID.');
    console.warn('   Las notificaciones push no funcionarán hasta que configures la clave.');
}

// Leer el template del service worker
const swTemplatePath = join(__dirname, '../public/sw.template.js');
const swOutputPath = join(__dirname, '../public/sw.js');

try {
    let swContent = readFileSync(swTemplatePath, 'utf-8');

    // Reemplazar la clave VAPID
    swContent = swContent.replace('%VITE_VAPID_PUBLIC_KEY%', vapidKey);

    // Escribir el service worker generado
    writeFileSync(swOutputPath, swContent, 'utf-8');

    console.log('✅ Service Worker generado correctamente');
    if (vapidKey) {
        console.log('✅ Clave VAPID inyectada');
    } else {
        console.log('⚠️  Service Worker generado sin clave VAPID');
    }
} catch (error) {
    console.error('❌ Error generando service worker:', error);
    process.exit(1);
}
