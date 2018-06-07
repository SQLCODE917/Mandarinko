import LCDText from '../../LCDText.js'
import styles from './errorLine.css'

export default function ErrorLine({ className, children }) {
  const containerClass = `${styles.errorLine} ${className}`
  return (
    <section className={containerClass}>
      <LCDText>{children}</LCDText>
    </section>
  )
}
