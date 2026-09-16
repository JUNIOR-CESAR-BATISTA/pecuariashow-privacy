/**
 * Onde o arquivo de dados fica guardado no navegador.
 *
 * Equivalente web do `BancoLocal.swift`, que grava um JSON dentro da área
 * privada do aplicativo no iPhone. Aqui o lugar é o IndexedDB do próprio
 * domínio: nenhum servidor, nenhuma conta, nada sai do aparelho.
 *
 * O IndexedDB foi escolhido no lugar do localStorage por dois motivos: a cota
 * é muito maior, e ele sobrevive melhor à limpeza automática que o navegador
 * faz quando o espaço aperta. Ainda assim é armazenamento de navegador, e o
 * usuário pode apagá-lo - por isso o backup manual não é enfeite.
 */

export interface Deposito {
  ler(): Promise<string | null>;
  gravar(texto: string): Promise<void>;
  apagar(): Promise<void>;
  /** Tamanho do que está guardado, em bytes. */
  tamanho(): Promise<number>;
}

const BANCO = "novilhanutri";
const ARMAZEM = "dados";
const CHAVE = "arquivo";

/** Depósito de teste e de emergência: vive só enquanto a aba estiver aberta. */
export class DepositoMemoria implements Deposito {
  private conteudo: string | null = null;

  async ler(): Promise<string | null> {
    return this.conteudo;
  }

  async gravar(texto: string): Promise<void> {
    this.conteudo = texto;
  }

  async apagar(): Promise<void> {
    this.conteudo = null;
  }

  async tamanho(): Promise<number> {
    return this.conteudo ? new TextEncoder().encode(this.conteudo).length : 0;
  }
}

function promessa<T>(pedido: IDBRequest<T>): Promise<T> {
  return new Promise((resolver, rejeitar) => {
    pedido.onsuccess = () => resolver(pedido.result);
    pedido.onerror = () => rejeitar(pedido.error ?? new Error("Falha no IndexedDB"));
  });
}

export class DepositoIndexedDB implements Deposito {
  private banco: Promise<IDBDatabase> | null = null;

  private abrir(): Promise<IDBDatabase> {
    if (!this.banco) {
      this.banco = new Promise((resolver, rejeitar) => {
        const pedido = indexedDB.open(BANCO, 1);
        pedido.onupgradeneeded = () => {
          if (!pedido.result.objectStoreNames.contains(ARMAZEM)) {
            pedido.result.createObjectStore(ARMAZEM);
          }
        };
        pedido.onsuccess = () => resolver(pedido.result);
        pedido.onerror = () => rejeitar(pedido.error ?? new Error("Falha ao abrir o banco"));
      });
    }
    return this.banco;
  }

  private async transacao<T>(
    modo: IDBTransactionMode,
    acao: (armazem: IDBObjectStore) => IDBRequest<T>,
  ): Promise<T> {
    const banco = await this.abrir();
    const tx = banco.transaction(ARMAZEM, modo);
    const resultado = await promessa(acao(tx.objectStore(ARMAZEM)));
    // Esperar a transação fechar é o que garante que a gravação chegou ao
    // disco antes de o programa seguir dizendo que salvou.
    await new Promise<void>((resolver, rejeitar) => {
      tx.oncomplete = () => resolver();
      tx.onabort = () => rejeitar(tx.error ?? new Error("Transação cancelada"));
      tx.onerror = () => rejeitar(tx.error ?? new Error("Falha na transação"));
    });
    return resultado;
  }

  async ler(): Promise<string | null> {
    const valor = await this.transacao<unknown>("readonly", (a) => a.get(CHAVE));
    return typeof valor === "string" ? valor : null;
  }

  async gravar(texto: string): Promise<void> {
    await this.transacao("readwrite", (a) => a.put(texto, CHAVE));
  }

  async apagar(): Promise<void> {
    await this.transacao("readwrite", (a) => a.delete(CHAVE));
  }

  async tamanho(): Promise<number> {
    const texto = await this.ler();
    return texto ? new TextEncoder().encode(texto).length : 0;
  }
}

/**
 * Escolhe o depósito disponível.
 *
 * Em aba anônima ou com armazenamento bloqueado o IndexedDB pode não existir.
 * Nesse caso o aplicativo continua funcionando na memória, e quem avisa que
 * os dados não vão sobreviver ao fechar é a interface.
 */
export function depositoPadrao(): { deposito: Deposito; persistente: boolean } {
  try {
    if (typeof indexedDB !== "undefined") {
      return { deposito: new DepositoIndexedDB(), persistente: true };
    }
  } catch {
    // Alguns navegadores lançam só de tocar no indexedDB com cookies bloqueados.
  }
  return { deposito: new DepositoMemoria(), persistente: false };
}
