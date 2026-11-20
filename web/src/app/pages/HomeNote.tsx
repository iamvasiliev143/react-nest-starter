import { Button, Input, Popup, type ButtonRef } from 'antd-mobile';
import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';

export function HomeNote() {
  const { t } = useTranslation('navigation');
  const [visible, setVisible] = useState(false);
  const [note, setNote] = useState('');
  const [draft, setDraft] = useState('');
  const [viewport, setViewport] = useState<{
    bottom: number;
    height: number;
  }>();
  const trigger = useRef<ButtonRef>(null);
  const dialog = useRef<HTMLElement>(null);

  useEffect(() => {
    const visualViewport = window.visualViewport;
    if (!visible || !visualViewport) return;

    function updateViewport() {
      if (!visualViewport) return;
      const { height, offsetTop } = visualViewport;
      setViewport({
        height,
        bottom: Math.max(
          0,
          document.documentElement.clientHeight - height - offsetTop,
        ),
      });
    }

    updateViewport();
    visualViewport.addEventListener('resize', updateViewport);
    visualViewport.addEventListener('scroll', updateViewport);
    return () => {
      visualViewport.removeEventListener('resize', updateViewport);
      visualViewport.removeEventListener('scroll', updateViewport);
    };
  }, [visible]);

  function close() {
    if (
      document.activeElement instanceof HTMLElement &&
      dialog.current?.contains(document.activeElement)
    ) {
      document.activeElement.blur();
    }
    setVisible(false);
  }

  return (
    <section aria-labelledby="home-note-title">
      <h2 id="home-note-title">{t('note')}</h2>
      {note && <p>{note}</p>}
      <Button
        ref={trigger}
        color="primary"
        onClick={() => {
          setDraft(note);
          setViewport(undefined);
          setVisible(true);
        }}
      >
        {t('editNote')}
      </Button>
      <Popup
        visible={visible}
        onClose={close}
        closeOnMaskClick
        destroyOnClose
        style={{ touchAction: 'pan-y' }}
        bodyClassName="note-popup-body"
        bodyStyle={{
          bottom: viewport?.bottom,
          maxHeight:
            viewport &&
            `min(var(--tg-viewport-height, 100dvh), ${viewport.height}px)`,
        }}
        afterShow={() => dialog.current?.focus()}
        afterClose={() =>
          trigger.current?.nativeElement?.focus({ preventScroll: true })
        }
      >
        <section
          ref={dialog}
          className="note-dialog"
          role="dialog"
          aria-modal="true"
          aria-labelledby="note-dialog-title"
          tabIndex={-1}
          onKeyDown={(event) => {
            if (event.key === 'Escape') close();
            if (event.key !== 'Tab') return;
            const input = event.currentTarget.querySelector('input');
            const last = event.currentTarget.querySelector<HTMLButtonElement>(
              'button[type="submit"]',
            );
            const atStart =
              event.target === input || event.target === event.currentTarget;
            if (event.shiftKey ? atStart : event.target === last) {
              event.preventDefault();
              (event.shiftKey ? last : input)?.focus();
            }
          }}
        >
          <h2 id="note-dialog-title">{t('editNote')}</h2>
          <form
            className="note-form"
            onSubmit={(event) => {
              event.preventDefault();
              setNote(draft.trim());
              close();
            }}
          >
            <label htmlFor="home-note-input">{t('note')}</label>
            <Input
              id="home-note-input"
              value={draft}
              onChange={setDraft}
              enterKeyHint="done"
              maxLength={140}
            />
            <div className="note-actions">
              <Button type="button" onClick={close}>
                {t('cancelNote')}
              </Button>
              <Button color="primary" type="submit">
                {t('saveNote')}
              </Button>
            </div>
          </form>
        </section>
      </Popup>
    </section>
  );
}
