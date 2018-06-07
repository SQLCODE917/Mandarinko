import styles from './LCDText.css'

export default function LCDText({ children, className}) {
  const containerClass = `${styles.lcdText} ${className}`
  return (
    <span className={containerClass}>
      { children }
      <span className={styles.cursor}>&nbsp;</span>
    </span>
  )
}
