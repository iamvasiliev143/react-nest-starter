import { TZDate } from '@date-fns/tz';
import { zodResolver } from '@hookform/resolvers/zod';
import { format } from 'date-fns';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { z } from 'zod';

const timezoneForm = z.object({ timezone: z.enum(['UTC', 'Europe/Kyiv']) });
type TimezoneForm = z.infer<typeof timezoneForm>;

export function TimePage() {
  const { t } = useTranslation(['time', 'navigation']);
  const { register, handleSubmit } = useForm<TimezoneForm>({
    resolver: zodResolver(timezoneForm),
    defaultValues: { timezone: 'UTC' },
  });
  const [selection, setSelection] = useState<TimezoneForm>({ timezone: 'UTC' });
  const now = new TZDate(Date.now(), selection.timezone);

  return (
    <section>
      <h2>{t('navigation:time')}</h2>
      <form onSubmit={handleSubmit(setSelection)}>
        <label>
          {t('time:timezone')}
          <select {...register('timezone')}>
            <option value="UTC">UTC</option>
            <option value="Europe/Kyiv">Europe/Kyiv</option>
          </select>
        </label>
        <button type="submit">{t('time:show')}</button>
      </form>
      <p role="status">
        {format(now, 'yyyy-MM-dd HH:mm:ss XXX')} ({selection.timezone})
      </p>
    </section>
  );
}
