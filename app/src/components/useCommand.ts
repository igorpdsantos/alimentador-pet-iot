// Executa um comando com estado de "enviando", erro amigável e "tentar de novo" com o mesmo req_id.
import { useCallback, useState } from 'react';
import { FeederError } from '../mqtt/client';
import type { CommandMap, CommandName } from '../protocol/commands';
import { newReqId } from '../protocol/commands';
import { useDevice } from '../store/device';

export type CommandError = { message: string; code: string; retry?: () => void };

export function useCommand() {
  const command = useDevice((s) => s.command);
  const [busy, setBusy] = useState<CommandName | null>(null);
  const [error, setError] = useState<CommandError | null>(null);

  const run = useCallback(
    async <K extends CommandName>(name: K, args: CommandMap[K]['args'], reqId = newReqId()): Promise<CommandMap[K]['data'] | null> => {
      setBusy(name);
      setError(null);
      try {
        return await command(name, args, reqId);
      } catch (e) {
        const fe = e instanceof FeederError ? e : new FeederError('ERROR', String(e));
        setError({
          code: fe.code,
          message: fe.message,
          retry: fe.code === 'TIMEOUT' ? () => void run(name, args, reqId) : undefined,
        });
        return null;
      } finally {
        setBusy(null);
      }
    },
    [command],
  );

  return { run, busy, error, clearError: () => setError(null) };
}
