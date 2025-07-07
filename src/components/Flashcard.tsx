import { useState } from "react";

type Props = {
  question: string;
  answer: string;
};

const Flashcard: React.FC<Props> = ({ question, answer }) => {
  const [flipped, setFlipped] = useState(false);

  return (
    <div
      className="w-96 h-60 perspective cursor-pointer"
      onClick={() => setFlipped(!flipped)}
    >
      <div
        className={`relative w-full h-full text-center duration-500 transform-style-preserve-3d ${
          flipped ? "rotate-y-180" : ""
        }`}
      >
        <div className="absolute w-full h-full backface-hidden bg-yellow-200 flex items-center justify-center rounded-xl shadow-lg text-xl p-4">
          {question}
        </div>
        <div className="absolute w-full h-full backface-hidden rotate-y-180 bg-purple-200 flex items-center justify-center rounded-xl shadow-lg text-xl p-4">
          {answer}
        </div>
      </div>
    </div>
  );
};

export default Flashcard;
