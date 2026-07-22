import { useState, useRef, useEffect } from "react"
import { ChevronDownIcon } from "@/assets/icons/ExportSvg"
import styles from "./Dropdown.module.scss"

interface DropdownOption {
    id: string | number;
    name: string;
    [key: string]: any;
}

interface DropdownProps {
    options: DropdownOption[];
    selectedId: string | number;
    onSelect: (option: DropdownOption) => void;
    placeholder?: string;
    label?: string;
    className?: string;
    variant?: "default" | "minimal" | "badge";
    direction?: "up" | "down";
}

const Dropdown = ({ 
    options, 
    selectedId, 
    onSelect, 
    placeholder = "Select...", 
    label,
    className = "",
    variant = "default",
    direction = "down"
}: DropdownProps) => {
    const [isOpen, setIsOpen] = useState(false)
    const dropdownRef = useRef<HTMLDivElement>(null)
    
    const selectedOption = options.find(opt => opt.id === selectedId)

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false)
            }
        }
        document.addEventListener("mousedown", handleClickOutside)
        return () => document.removeEventListener("mousedown", handleClickOutside)
    }, [])

    return (
        <div className={`${styles.dropdownRoot} ${className}`} ref={dropdownRef}>
            {label && <label className={styles.dropdownLabel}>{label}</label>}
            
            <div className={`${styles.dropdownContainer} ${styles[variant]} ${styles[direction]} ${isOpen ? styles.open : ''}`}>
                <button 
                    className={styles.dropdownToggle}
                    onClick={() => setIsOpen(!isOpen)}
                    type="button"
                >
                    <span className={styles.selectedValue}>
                        {selectedOption ? selectedOption.name : placeholder}
                    </span>
                    <ChevronDownIcon />
                </button>

                {isOpen && (
                    <div className={styles.dropdownMenu}>
                        {options.map((option) => (
                            <div
                                key={option.id}
                                className={`${styles.dropdownItem} ${option.id === selectedId ? styles.active : ''}`}
                                onClick={() => {
                                    onSelect(option)
                                    setIsOpen(false)
                                }}
                            >
                                <span className={styles.itemName}>{option.name}</span>
                                {option.id === selectedId && (
                                    <span className={styles.activeCheck}>
                                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                                            <polyline points="20 6 9 17 4 12"></polyline>
                                        </svg>
                                    </span>
                                )}
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    )
}

export default Dropdown
