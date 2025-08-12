// firebase-config.js
// Esta configuración es específica para tu proyecto de Firebase.
// Proviene de la consola de Firebase cuando registraste tu aplicación web.

const firebaseConfig = {
  apiKey: "AIzaSyAlqGoYrHkASbhmE2aBKIOXqkkNBBEEiGU",
  authDomain: "feria-online-ec7c6.firebaseapp.com",
  projectId: "feria-online-ec7c6",
  storageBucket: "feria-online-ec7c6.firebasestorage.app",
  messagingSenderId: "1001881267179",
  appId: "1:1001881267179:web:fc5ac0fd940964537887ae",
  measurementId: "G-GQZZQMNVPH" // Este ID es para Google Analytics, si lo activaste.
};

// Exportamos la configuración como un objeto para que pueda ser importada en otros archivos.
export { firebaseConfig };

// También exportamos el 'appId' por separado, ya que lo usamos directamente para las rutas de Firestore.
// Puedes extraerlo del objeto firebaseConfig o definirlo aquí si te es más claro.
const appId = "1:1001881267179:web:fc5ac0fd940964537887ae"; // Tu 'appId' específico
export { appId };
