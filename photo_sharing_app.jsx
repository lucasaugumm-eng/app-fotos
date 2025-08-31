import React, { useState, useEffect } from "react";
import { initializeApp } from "firebase/app";
import {
  getAuth,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  onAuthStateChanged,
  signOut,
} from "firebase/auth";
import {
  getFirestore,
  collection,
  addDoc,
  getDocs,
  getDoc,
  doc,
  query,
  where,
  updateDoc,
} from "firebase/firestore";
import {
  getStorage,
  ref,
  uploadBytes,
  getDownloadURL,
  listAll,
} from "firebase/storage";

// 🔧 Configure seu Firebase aqui
const firebaseConfig = {
  apiKey: "SUA_API_KEY",
  authDomain: "SEU_DOMINIO.firebaseapp.com",
  projectId: "SEU_PROJECT_ID",
  storageBucket: "SEU_BUCKET.appspot.com",
  messagingSenderId: "SEU_SENDER_ID",
  appId: "SEU_APP_ID",
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const storage = getStorage(app);

export default function App() {
  const [user, setUser] = useState(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [folders, setFolders] = useState([]);
  const [folderName, setFolderName] = useState("");
  const [file, setFile] = useState(null);
  const [portalView, setPortalView] = useState(false);
  const [portalFolder, setPortalFolder] = useState(null);
  const [photos, setPhotos] = useState([]);

  useEffect(() => {
    onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
    });
  }, []);

  async function register() {
    await createUserWithEmailAndPassword(auth, email, password);
  }

  async function login() {
    await signInWithEmailAndPassword(auth, email, password);
  }

  async function logout() {
    await signOut(auth);
  }

  async function createFolder() {
    if (!folderName || !user) return;
    await addDoc(collection(db, "folders"), {
      name: folderName,
      date: new Date().toISOString(),
      user: user.uid,
      publicLink: null,
    });
    setFolderName("");
    loadFolders();
  }

  async function loadFolders() {
    if (!user) return;
    const q = query(collection(db, "folders"), where("user", "==", user.uid));
    const snapshot = await getDocs(q);
    const docs = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
    setFolders(docs);
  }

  async function uploadPhoto(folderId) {
    if (!file) return;
    const storageRef = ref(storage, `folders/${folderId}/${file.name}`);
    await uploadBytes(storageRef, file);
    alert("Foto enviada!");
  }

  async function generateLink(folderId) {
    const publicLink = window.location.origin + `?folder=${folderId}`;
    const folderRef = doc(db, "folders", folderId);
    await updateDoc(folderRef, { publicLink });
    alert("Link gerado: " + publicLink);
    loadFolders();
  }

  async function openPortal(folderId) {
    setPortalView(true);
    setPortalFolder(folderId);
    const folderRef = ref(storage, `folders/${folderId}`);
    const list = await listAll(folderRef);
    const urls = await Promise.all(list.items.map((item) => getDownloadURL(item)));
    setPhotos(urls);
  }

  useEffect(() => {
    // Verifica se está acessando via link público
    const params = new URLSearchParams(window.location.search);
    const folderId = params.get("folder");
    if (folderId) {
      openPortal(folderId);
    }
  }, []);

  if (portalView) {
    return (
      <div className="p-4 max-w-lg mx-auto">
        <h1 className="text-xl font-bold">Portal Público</h1>
        <div className="grid grid-cols-2 gap-2 mt-4">
          {photos.map((url, idx) => (
            <a key={idx} href={url} download target="_blank" rel="noreferrer">
              <img src={url} alt="foto" className="w-full border" />
            </a>
          ))}
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="p-4 flex flex-col gap-2 max-w-sm mx-auto">
        <h1 className="text-xl font-bold">Login / Cadastro</h1>
        <input
          placeholder="Email"
          className="border p-2"
          onChange={(e) => setEmail(e.target.value)}
        />
        <input
          placeholder="Senha"
          type="password"
          className="border p-2"
          onChange={(e) => setPassword(e.target.value)}
        />
        <button className="bg-blue-500 text-white p-2" onClick={register}>
          Cadastrar
        </button>
        <button className="bg-green-500 text-white p-2" onClick={login}>
          Entrar
        </button>
      </div>
    );
  }

  return (
    <div className="p-4 max-w-lg mx-auto">
      <h1 className="text-xl font-bold">Minhas Pastas</h1>
      <button className="bg-red-500 text-white p-2" onClick={logout}>
        Sair
      </button>

      <div className="flex gap-2 mt-4">
        <input
          placeholder="Nome da pasta"
          className="border p-2 flex-1"
          value={folderName}
          onChange={(e) => setFolderName(e.target.value)}
        />
        <button className="bg-blue-500 text-white p-2" onClick={createFolder}>
          Criar
        </button>
      </div>

      <ul className="mt-4">
        {folders.map((folder) => (
          <li key={folder.id} className="border p-2 mt-2">
            <strong>{folder.name}</strong> - {new Date(folder.date).toLocaleString()}
            <div className="mt-2">
              <input type="file" onChange={(e) => setFile(e.target.files[0])} />
              <button
                className="bg-green-500 text-white p-1 ml-2"
                onClick={() => uploadPhoto(folder.id)}
              >
                Enviar Foto
              </button>
              <button
                className="bg-purple-500 text-white p-1 ml-2"
                onClick={() => generateLink(folder.id)}
              >
                Compartilhar Link
              </button>
              {folder.publicLink && (
                <a
                  href={folder.publicLink}
                  target="_blank"
                  rel="noreferrer"
                  className="text-blue-600 underline ml-2"
                >
                  Abrir Portal
                </a>
              )}
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
