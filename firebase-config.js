// firebase-config.js
// **IMPORTANTE**: Reemplaza los placeholders con la información REAL de tu proyecto Firebase
export const firebaseConfig = {
    apiKey: "AIzaSyAlqGoYrHkASbhmE2aBKIOXqkkNBBEEiGU", // Tu API Key
    authDomain: "feria-online-ec7c6.firebaseapp.com", // Tu Dominio de Autenticación
    projectId: "feria-online-ec7c6", // Tu ID de Proyecto
    storageBucket: "feria-online-ec7c6.firebasestorage.app", // Tu Storage Bucket
    messagingSenderId: "1001881267179", // Tu Messaging Sender ID
    appId: "1:1001881267179:web:fc5ac0fd940964537887ae" // TU APP ID REAL de Firebase
};

// CRUCIAL: Definimos 'appId' para las rutas de Firestore.
// Aseguramos que siempre use el 'appId' que viene de la configuración de Firebase,
// garantizando consistencia en todas las páginas.
export const appId = firebaseConfig.appId;

console.log("FirebaseConfig cargada. Usando appId para rutas:", appId); // Nuevo log de confirmación
