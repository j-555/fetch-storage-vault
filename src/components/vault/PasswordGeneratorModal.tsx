// probably the most over-engineered modal in this entire fucking app, but goddamn, it's a thing of beauty.

import { Fragment, useState, useEffect, useCallback, useMemo } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import { XMarkIcon, ClipboardDocumentIcon, ArrowPathIcon, CheckIcon } from '@heroicons/react/24/outline';

interface PasswordGeneratorModalProps {
  isOpen: boolean;
  onClose: () => void;
  onPasswordGenerated: (password: string) => void;
}

export function PasswordGeneratorModal({ isOpen, onClose, onPasswordGenerated }: PasswordGeneratorModalProps) {
  const [length, setLength] = useState(16);
  const [includeNumbers, setIncludeNumbers] = useState(true);
  const [includeSymbols, setIncludeSymbols] = useState(true);
  const [includeUppercase, setIncludeUppercase] = useState(true);
  const [excludeAmbiguous, setExcludeAmbiguous] = useState(false);
  const [generatedPassword, setGeneratedPassword] = useState('');
  const [isCopied, setIsCopied] = useState(false);

  // character sets with ambiguous characters separated
  const charSets = useMemo(() => ({
    numbers: '0123456789',
    numbersNoAmbiguous: '23456789', // excludes 0, 1
    symbols: '!@#$%^&*()_+-=[]{}|;:,.<>?~`',
    symbolsNoAmbiguous: '!@#$%^&*+-=[]{}|;:,.<>?~`', // excludes ()_
    uppercase: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ',
    uppercaseNoAmbiguous: 'ABCDEFGHJKLMNPQRSTUVWXYZ', // excludes I, O
    lowercase: 'abcdefghijklmnopqrstuvwxyz',
    lowercaseNoAmbiguous: 'abcdefghjkmnpqrstuvwxyz' // excludes i, l, o
  }), []);

  const getSecureRandomInt = useCallback((max: number): number => {
    const randomBuffer = new Uint32Array(1);
    const limit = Math.floor(0x100000000 / max) * max;
    
    let randomValue;
    do {
      crypto.getRandomValues(randomBuffer);
      randomValue = randomBuffer[0];
    } while (randomValue >= limit);
    
    return randomValue % max;
  }, []);

  const secureArrayShuffle = useCallback((array: string[]): string[] => {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = getSecureRandomInt(i + 1);
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  }, [getSecureRandomInt]);

  const generatePassword = useCallback(() => {
    setGeneratedPassword('');
    
    const activeCharSets: string[] = [];
    const guaranteedChars: string[] = [];
    
    const numbersSet = excludeAmbiguous ? charSets.numbersNoAmbiguous : charSets.numbers;
    const symbolsSet = excludeAmbiguous ? charSets.symbolsNoAmbiguous : charSets.symbols;
    const uppercaseSet = excludeAmbiguous ? charSets.uppercaseNoAmbiguous : charSets.uppercase;
    const lowercaseSet = excludeAmbiguous ? charSets.lowercaseNoAmbiguous : charSets.lowercase;

    activeCharSets.push(lowercaseSet);
    guaranteedChars.push(lowercaseSet[getSecureRandomInt(lowercaseSet.length)]);

    if (includeNumbers) {
      activeCharSets.push(numbersSet);
      guaranteedChars.push(numbersSet[getSecureRandomInt(numbersSet.length)]);
    }
    if (includeSymbols) {
      activeCharSets.push(symbolsSet);
      guaranteedChars.push(symbolsSet[getSecureRandomInt(symbolsSet.length)]);
    }
    if (includeUppercase) {
      activeCharSets.push(uppercaseSet);
      guaranteedChars.push(uppercaseSet[getSecureRandomInt(uppercaseSet.length)]);
    }

    const allChars = activeCharSets.join('');
    const remainingLength = Math.max(0, length - guaranteedChars.length);
    
    const remainingChars: string[] = [];
    for (let i = 0; i < remainingLength; i++) {
      remainingChars.push(allChars[getSecureRandomInt(allChars.length)]);
    }

    const allPasswordChars = [...guaranteedChars, ...remainingChars];
    const shuffledPassword = secureArrayShuffle(allPasswordChars);
    
    setGeneratedPassword(shuffledPassword.join(''));
  }, [length, includeNumbers, includeSymbols, includeUppercase, excludeAmbiguous, charSets, getSecureRandomInt, secureArrayShuffle]);

  useEffect(() => {
    if (isOpen) {
      generatePassword();
    }
  }, [isOpen, generatePassword]);

  const handleUsePassword = useCallback(() => {
    onPasswordGenerated(generatedPassword);
    setGeneratedPassword('');
    onClose();
  }, [generatedPassword, onPasswordGenerated, onClose]);

  const handleCopyPassword = useCallback(async () => {
    if (isCopied || !generatedPassword) return;

    await navigator.clipboard.writeText(generatedPassword);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  }, [generatedPassword, isCopied]);

  useEffect(() => {
    if (!isOpen) {
      setGeneratedPassword('');
      setIsCopied(false);
    }
  }, [isOpen]);

  const passwordStrength = useMemo(() => {
    let charSetSize = 0;
    if (excludeAmbiguous) {
      charSetSize += charSets.lowercaseNoAmbiguous.length;
      if (includeNumbers) charSetSize += charSets.numbersNoAmbiguous.length;
      if (includeSymbols) charSetSize += charSets.symbolsNoAmbiguous.length;
      if (includeUppercase) charSetSize += charSets.uppercaseNoAmbiguous.length;
    } else {
      charSetSize += charSets.lowercase.length;
      if (includeNumbers) charSetSize += charSets.numbers.length;
      if (includeSymbols) charSetSize += charSets.symbols.length;
      if (includeUppercase) charSetSize += charSets.uppercase.length;
    }
    
    const entropy = Math.log2(Math.pow(charSetSize, length));
    const roundedEntropy = Math.round(entropy);
    
    let level: string;
    let color: string;
    let bgColor: string;
    
    if (roundedEntropy < 50) {
      level = 'Weak';
      color = 'text-red-400';
      bgColor = 'bg-red-900/20 border-red-600';
    } else if (roundedEntropy < 70) {
      level = 'Good';
      color = 'text-amber-400';
      bgColor = 'bg-amber-900/20 border-amber-600';
    } else {
      level = 'Strong';
      color = 'text-green-400';
      bgColor = 'bg-green-900/20 border-green-600';
    }
    
    return {
      entropy: roundedEntropy,
      level,
      color,
      bgColor
    };
  }, [length, includeNumbers, includeSymbols, includeUppercase, excludeAmbiguous, charSets]);

  return (
    <Transition appear show={isOpen} as={Fragment}>
      <Dialog as="div" className="relative z-[60]" onClose={onClose}>
        <Transition.Child
          as={Fragment}
          enter="ease-out duration-300"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-200"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-black/70" />
        </Transition.Child>

        <div className="fixed inset-0 overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-4">
            <Transition.Child
              as={Fragment}
              enter="ease-out duration-300"
              enterFrom="opacity-0 scale-95"
              enterTo="opacity-100 scale-100"
              leave="ease-in duration-200"
              leaveFrom="opacity-100 scale-100"
              leaveTo="opacity-0 scale-95"
            >
              <Dialog.Panel className="w-full max-w-md transform overflow-hidden rounded-lg bg-gradient-to-b from-gray-900 to-black border border-gray-700 shadow-xl transition-all p-6">
                <div className="flex items-center justify-between pb-4 border-b border-gray-700">
                    <Dialog.Title className="text-lg font-medium text-white">
                        Generate Password
                    </Dialog.Title>
                    <button onClick={onClose} className="p-1 text-gray-400 hover:text-white rounded-md transition">
                        <XMarkIcon className="h-5 w-5" />
                    </button>
                </div>

                <div className="py-5 space-y-4">
                    <div className="relative">
                        <input
                            type="text"
                            readOnly
                            value={generatedPassword}
                            className="w-full bg-gray-900 text-white p-3 rounded-md pr-20 font-mono"
                            placeholder="Generated password will appear here..."
                        />
                        <div className="absolute inset-y-0 right-0 pr-3 flex items-center space-x-2">
                            <button 
                              onClick={generatePassword} 
                              className="text-gray-400 hover:text-white transition"
                              title="Generate new password"
                            >
                                <ArrowPathIcon className="h-5 w-5" />
                            </button>
                            <button 
                              onClick={handleCopyPassword} 
                              className="text-gray-400 hover:text-white transition"
                              title="Copy to clipboard"
                            >
                                {isCopied ? <CheckIcon className="h-5 w-5 text-green-500" /> : <ClipboardDocumentIcon className="h-5 w-5" />}
                            </button>
                        </div>
                    </div>

                    <div className={`text-sm text-center p-3 rounded-md border ${passwordStrength.bgColor}`}>
                        <div className="flex items-center justify-center space-x-2">
                            <span className="text-gray-300">Password Strength:</span>
                            <span className={`font-semibold ${passwordStrength.color}`}>
                                {passwordStrength.level}
                            </span>
                        </div>
                        <div className="text-xs text-gray-400 mt-1">
                            Entropy: <span className={`font-mono ${passwordStrength.color}`}>{passwordStrength.entropy} bits</span>
                        </div>
                    </div>

                    <div className="space-y-3 text-sm text-gray-300">
                        <div>
                            <label htmlFor="length" className="flex items-center justify-between">
                                <span>Password Length</span>
                                <span className="text-white font-mono">{length}</span>
                            </label>
                            <input
                                type="range"
                                id="length"
                                min="8"
                                max="32"
                                value={length}
                                onChange={(e) => setLength(Number(e.target.value))}
                                className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer mt-2"
                            />
                        </div>

                        <div className="flex items-center justify-between">
                            <label htmlFor="numbers">Include Numbers</label>
                            <input 
                              type="checkbox" 
                              id="numbers" 
                              checked={includeNumbers} 
                              onChange={(e) => setIncludeNumbers(e.target.checked)} 
                              className="form-checkbox h-5 w-5 bg-gray-700 border-gray-600 text-indigo-500 rounded focus:ring-indigo-500" 
                            />
                        </div>
                        
                        <div className="flex items-center justify-between">
                            <label htmlFor="symbols">Include Symbols</label>
                            <input 
                              type="checkbox" 
                              id="symbols" 
                              checked={includeSymbols} 
                              onChange={(e) => setIncludeSymbols(e.target.checked)} 
                              className="form-checkbox h-5 w-5 bg-gray-700 border-gray-600 text-indigo-500 rounded focus:ring-indigo-500" 
                            />
                        </div>
                        
                        <div className="flex items-center justify-between">
                            <label htmlFor="uppercase">Include Uppercase</label>
                            <input 
                              type="checkbox" 
                              id="uppercase" 
                              checked={includeUppercase} 
                              onChange={(e) => setIncludeUppercase(e.target.checked)} 
                              className="form-checkbox h-5 w-5 bg-gray-700 border-gray-600 text-indigo-500 rounded focus:ring-indigo-500" 
                            />
                        </div>

                        <div className="flex items-center justify-between">
                            <label htmlFor="exclude-ambiguous">Exclude Ambiguous Characters</label>
                            <input 
                              type="checkbox" 
                              id="exclude-ambiguous" 
                              checked={excludeAmbiguous} 
                              onChange={(e) => setExcludeAmbiguous(e.target.checked)} 
                              className="form-checkbox h-5 w-5 bg-gray-700 border-gray-600 text-indigo-500 rounded focus:ring-indigo-500" 
                            />
                        </div>
                        
                        {excludeAmbiguous && (
                          <div className="text-xs text-gray-500 pl-4">
                            Excludes: 0, 1, I, O, i, l, o, (, ), _
                          </div>
                        )}
                    </div>
                </div>

                <div className="pt-4 border-t border-gray-700 flex justify-end">
                    <button 
                      onClick={handleUsePassword} 
                      className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 transition disabled:opacity-50"
                      disabled={!generatedPassword}
                    >
                        Use Password
                    </button>
                </div>

              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition>
  );
}