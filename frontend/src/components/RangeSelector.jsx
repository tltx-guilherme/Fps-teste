import { useState, useRef, useEffect } from 'react';
import './RangeSelector.css';

export default function RangeSelector({ value, onChange }) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  const options = [
    { value: '24h', label: 'Últimas 24h' },
    { value: '7d', label: 'Últimos 7 dias' },
    { value: '30d', label: 'Últimos 30 dias' },
  ];

  const selectedLabel = options.find(opt => opt.value === value)?.label || 'Selecionar';

  // Fechar dropdown ao clicar fora
  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelect = (optionValue) => {
    onChange(optionValue);
    setIsOpen(false);
  };

  return (
    <div className="range-selector" ref={dropdownRef}>
      <button
        className="range-selector-trigger"
        onClick={() => setIsOpen(!isOpen)}
      >
        <span>{selectedLabel}</span>
        <svg
          className={`range-selector-icon ${isOpen ? 'open' : ''}`}
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
        >
          <polyline points="6 9 12 15 18 9"></polyline>
        </svg>
      </button>

      {isOpen && (
        <div className="range-selector-menu">
          {options.map((option) => (
            <button
              key={option.value}
              className={`range-selector-option ${value === option.value ? 'active' : ''}`}
              onClick={() => handleSelect(option.value)}
            >
              {option.label}
              {value === option.value && (
                <svg className="check-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <polyline points="20 6 9 17 4 12"></polyline>
                </svg>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
