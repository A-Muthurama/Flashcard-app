import { useEffect, useState } from "react";
import "./index.css";
import {
  collection,
  getDocs,
  addDoc,
  deleteDoc,
  updateDoc,
  doc,
  serverTimestamp,
  Timestamp,
  FieldValue,
} from "firebase/firestore";
import { db, auth, provider } from "./firebase";
import { signInWithPopup, signOut } from "firebase/auth";
import jsPDF from "jspdf";

type Card = {
  id?: string;
  question: string;
  answer: string;
  createdBy?: string;
  createdAt?: Timestamp | FieldValue;
};

function App() {
  const [user, setUser] = useState<any>(null);
  const [darkMode, setDarkMode] = useState(false);
  const [cards, setCards] = useState<Card[]>([]);
  const [index, setIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [newCard, setNewCard] = useState<Card>({ question: "", answer: "" });
  const [showGrid, setShowGrid] = useState(false);
  const [visibleLimit, setVisibleLimit] = useState(10);
  const [audio] = useState(new Audio("/bg-music.mp3"));
  const [musicPlaying, setMusicPlaying] = useState(true);

  const flashcardRef = collection(db, "flashcards");

  useEffect(() => {
    document.body.className = darkMode ? "dark-mode" : "";
  }, [darkMode]);

  useEffect(() => {
    audio.loop = true;
    if (musicPlaying) {
      audio.play().catch((err) => console.warn("Autoplay may be blocked", err));
    }
    return () => audio.pause();
  }, [audio, musicPlaying]);

  useEffect(() => {
    const loadCards = async () => {
      try {
        const querySnapshot = await getDocs(flashcardRef);
        const publicCards: Card[] = [];
        querySnapshot.forEach((docSnap) => {
          const data = docSnap.data();
          publicCards.push({
            id: docSnap.id,
            question: data.question,
            answer: data.answer,
            createdBy: data.createdBy,
            createdAt: data.createdAt as Timestamp | FieldValue,
          });
        });
        setCards(publicCards);
      } catch (err) {
        console.error("Failed to load cards:", err);
      }
    };
    loadCards();
  }, []);

  useEffect(() => {
    const unsub = auth.onAuthStateChanged((currentUser) => {
      setUser(currentUser);
    });
    return () => unsub();
  }, []);

  const login = () => {
    signInWithPopup(auth, provider).catch((error) =>
      console.error("Login Error", error)
    );
  };

  const logout = () => {
    signOut(auth);
  };

  const formatDate = (timestamp?: Timestamp | FieldValue) => {
    if (!timestamp || typeof (timestamp as Timestamp).toDate !== "function") return "Unknown";
    return (timestamp as Timestamp).toDate().toLocaleString();
  };

  const nextCard = () => {
    if (index < cards.length - 1) {
      setIndex(index + 1);
      setFlipped(false);
    }
  };

  const prevCard = () => {
    if (index > 0) {
      setIndex(index - 1);
      setFlipped(false);
    }
  };

  const toggleMusic = () => {
    if (musicPlaying) {
      audio.pause();
    } else {
      audio.play();
    }
    setMusicPlaying(!musicPlaying);
  };

  const handleAddCard = async () => {
    if (!newCard.question.trim() || !newCard.answer.trim()) return;
    const createdBy = user?.displayName || user?.email || "Anonymous";
    const cardWithMeta = {
      ...newCard,
      createdBy,
      createdAt: serverTimestamp(),
    };

    try {
      const docRef = await addDoc(flashcardRef, cardWithMeta);
      const added: Card = {
        ...newCard,
        id: docRef.id,
        createdBy,
        createdAt: new Date() as unknown as Timestamp,
      };
      setCards((prevCards) => [...prevCards, added]);
      setNewCard({ question: "", answer: "" });
      setIndex(cards.length);
      setFlipped(false);
    } catch (error) {
      console.error("Error adding flashcard:", error);
    }
  };

  const deleteCard = async (id: string | undefined) => {
    if (!id) return;
    try {
      await deleteDoc(doc(db, "flashcards", id));
      const filtered = cards.filter((card) => card.id !== id);
      setCards(filtered);
      if (index >= filtered.length) {
        setIndex(Math.max(filtered.length - 1, 0));
      }
    } catch (error) {
      console.error("Error deleting card:", error);
    }
  };

  const updateCard = async (id: string | undefined, updated: Card) => {
    if (!id) return;
    try {
      await updateDoc(doc(db, "flashcards", id), {
        question: updated.question,
        answer: updated.answer,
      });
      const updatedList = cards.map((card) =>
        card.id === id ? { ...card, ...updated } : card
      );
      setCards(updatedList);
    } catch (error) {
      console.error("Error updating card:", error);
    }
  };
  
  const handleExport = (type: string) => {
    switch (type) {
      case "csv":
        exportToCSV();
        break;
      case "json":
        exportToJSON();
        break;
      case "txt":
        exportToText();
        break;
      case "pdf":
        exportToPDF();
        break;
      default:
        break;
    }
  };

  const exportToCSV = () => {
    const csv =
      "data:text/csv;charset=utf-8," +
      ["Question,Answer,Created By,Created At", ...cards.map(c =>
        `"${c.question}","${c.answer}","${c.createdBy || ""}","${formatDate(c.createdAt)}"`
      )].join("\n");
    downloadFile(csv, "flashcards.csv");
  };

  const exportToJSON = () => {
    const json =
      "data:text/json;charset=utf-8," +
      encodeURIComponent(JSON.stringify(cards, null, 2));
    downloadFile(json, "flashcards.json");
  };

  const exportToText = () => {
    const txt =
      "data:text/plain;charset=utf-8," +
      cards.map(c =>
        `Q: ${c.question}\nA: ${c.answer}\nBy: ${c.createdBy}\nAt: ${formatDate(c.createdAt)}\n`
      ).join("\n");
    downloadFile(txt, "flashcards.txt");
  };

  const exportToPDF = () => {
    const doc = new jsPDF();
    let y = 10;
    doc.setFontSize(12);
    cards.forEach((c, i) => {
      doc.text(`Q${i + 1}: ${c.question}`, 10, y);
      y += 7;
      doc.text(`A${i + 1}: ${c.answer}`, 10, y);
      y += 7;
      doc.text(`By: ${c.createdBy || "Unknown"} at ${formatDate(c.createdAt)}`, 10, y);
      y += 10;
      if (y > 280) {
        doc.addPage();
        y = 10;
      }
    });
    doc.save("flashcards.pdf");
  };

  const downloadFile = (content: string, filename: string) => {
    const encoded = encodeURI(content);
    const link = document.createElement("a");
    link.setAttribute("href", encoded);
    link.setAttribute("download", filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="container">
      <div className="header">
        <div style={{ position: "absolute", top: "10px", left: "10px" }}>
          {user ? (
            <button className="toggle-btn" onClick={logout}>
              🚪 Logout ({user.displayName})
            </button>
          ) : (
            <button className="toggle-btn" onClick={login}>
              🔐 Login with Google
            </button>
          )}
        </div>

        <h1>🧠 Flashcard Quiz</h1>

        <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
          <button onClick={() => setDarkMode(!darkMode)} className="toggle-btn">
            {darkMode ? "☀️ Light Mode" : "🌙 Dark Mode"}
          </button>

          <button onClick={toggleMusic} className="toggle-btn">
            {musicPlaying ? "🔇 Mute Music" : "🔊 Play Music"}
          </button>
        </div>
      </div>

      <div style={{ display: "flex", gap: "1rem", flexWrap: "wrap" }}>
        <button className="toggle-btn" onClick={() => setShowGrid(!showGrid)}>
          {showGrid ? "🃏 Show Single Card" : "📚 Show All Cards"}
        </button>

        <select className="toggle-btn" onChange={(e) => handleExport(e.target.value)}>
          <option value="">📤 Export Flashcards</option>
          <option value="csv">CSV</option>
          <option value="json">JSON</option>
          <option value="txt">Text</option>
          <option value="pdf">PDF</option>
        </select>
      </div>

      {!showGrid && cards.length > 0 && (
        <div className="flashcard-wrapper">
          <div
            className={`flashcard ${flipped ? "flipped" : ""}`}
            onClick={() => setFlipped(!flipped)}
          >
            <div className="card-inner">
              <div className="card-front">
                <h2>{cards[index]?.question}</h2>
              </div>
              <div className="card-back">
                <p>{cards[index]?.answer}</p>
              </div>
            </div>
          </div>
          <p className="counter">
            Card {index + 1} of {cards.length} <br />
            <i>
              👤 {cards[index]?.createdBy || "Unknown"} <br />
              📅 {formatDate(cards[index]?.createdAt)}
            </i>
          </p>
          <div className="btn-row">
            <button onClick={prevCard} disabled={index === 0}>
              ◀️ Previous
            </button>
            <button onClick={nextCard} disabled={index === cards.length - 1}>
              Next ▶️
            </button>
          </div>
        </div>
      )}

      {showGrid && (
        <>
          <div className="grid-view">
            {cards.slice(0, visibleLimit).map((card) => (
              <div key={card.id} className="grid-card">
                <strong>Q:</strong> {card.question}
                <br />
                <strong>A:</strong> {card.answer}
                <br />
                <small>
                  👤 {card.createdBy || "Unknown"} <br />
                  📅 {formatDate(card.createdAt)}
                </small>
                <br />
                {user && (
                  <>
                    <button
                      onClick={() => {
                        const updatedQ = prompt("Edit Question:", card.question);
                        const updatedA = prompt("Edit Answer:", card.answer);
                        if (updatedQ && updatedA) {
                          updateCard(card.id, {
                            question: updatedQ,
                            answer: updatedA,
                          });
                        }
                      }}
                      className="grid-btn edit"
                    >
                      ✏️ Edit
                    </button>
                    <button
                      onClick={() => deleteCard(card.id)}
                      className="grid-btn delete"
                    >
                      🗑️ Delete
                    </button>
                  </>
                )}
              </div>
            ))}
          </div>

          {visibleLimit < cards.length && (
            <button
              className="toggle-btn"
              style={{ marginTop: "1rem" }}
              onClick={() => setVisibleLimit(cards.length)}
            >
              🔽 Show More Cards
            </button>
          )}
        </>
      )}

      <div className="add-card">
        <h3>Add New Flashcard</h3>
        <input
          type="text"
          placeholder="Enter question"
          value={newCard.question}
          onChange={(e) =>
            setNewCard({ ...newCard, question: e.target.value })
          }
        />
        <input
          type="text"
          placeholder="Enter answer"
          value={newCard.answer}
          onChange={(e) => setNewCard({ ...newCard, answer: e.target.value })}
        />
        <button onClick={handleAddCard}>➕ Add Flashcard</button>
      </div>
    </div>
  );
}

export default App;
