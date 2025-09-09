import React from 'react';
import Image from 'next/image';

interface FlashyButtonProps {
  onClick: () => void;
}

const FlashyButton: React.FC<FlashyButtonProps> = ({ onClick }) => {
  const imageUrl = "https://static.wikia.nocookie.net/lobotomycorp/images/6/6d/Don%27t_Touch_Me_Close-up.png/revision/latest?cb=20170205230627";

  return (
    <button
      onClick={onClick}
      className="bg-transparent border-none p-0 cursor-pointer transform hover:scale-110 transition-transform duration-200"
      aria-label="Don't Touch Me"
    >
      <Image src={imageUrl} alt="Don't Touch Me button" width={200} height={200} />
    </button>
  );
};

export default FlashyButton;
