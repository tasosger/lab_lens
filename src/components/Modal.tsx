import { useEffect, useId, useRef, type ReactNode } from 'react'

export function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: ReactNode }) {
  const dialog = useRef<HTMLDialogElement>(null)
  const titleId = useId()
  useEffect(() => {
    const previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null
    const element = dialog.current
    element?.showModal()
    return () => { element?.close(); if (previousFocus?.isConnected) previousFocus.focus() }
  }, [])
  return <dialog className="dashboard-modal" ref={dialog} aria-labelledby={titleId}
    onCancel={event => { event.preventDefault(); onClose() }}>
    <h2 id={titleId}>{title}</h2>
    {children}
  </dialog>
}
