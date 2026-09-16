/**
 * Guarda o estado do aplicativo e cuida de gravá-lo.
 *
 * Equivalente web do `AppEstado.swift`: as alterações seguidas são agrupadas
 * numa gravação só, e quem quiser saber quando algo mudou se inscreve.
 */
import {
  VERSAO_ATUAL,
  dadosIniciais,
  desserializar,
  serializar,
  type DadosApp,
} from "../nucleo/dadosApp.js";
import type { Deposito } from "./deposito.js";

/** Espera antes de gravar, para uma rajada de alterações virar uma escrita só. */
const ESPERA_GRAVACAO = 400;

export class Repositorio {
  private dados: DadosApp = dadosIniciais();
  private ouvintes = new Set<(dados: DadosApp) => void>();
  private agendado: ReturnType<typeof setTimeout> | null = null;
  private gravando: Promise<void> = Promise.resolve();

  /** Última falha de leitura ou gravação, para a interface poder mostrar. */
  erro: string | null = null;

  constructor(private readonly deposito: Deposito) {}

  /** Lê o que estiver guardado. Sem arquivo, começa com o catálogo padrão. */
  async carregar(): Promise<DadosApp> {
    try {
      const texto = await this.deposito.ler();
      this.dados = texto ? desserializar(texto) : dadosIniciais();
      this.erro = null;
    } catch (causa) {
      // Arquivo ilegível não pode apagar o que o usuário tem: preferimos
      // começar do zero em memória e avisar, sem gravar por cima.
      this.erro = causa instanceof Error ? causa.message : String(causa);
      this.dados = dadosIniciais();
    }
    this.avisar();
    return this.dados;
  }

  atual(): DadosApp {
    return this.dados;
  }

  /** Aplica uma alteração e agenda a gravação. */
  alterar(mudanca: (dados: DadosApp) => DadosApp): void {
    this.dados = { ...mudanca(this.dados), versao: VERSAO_ATUAL };
    this.avisar();
    this.agendar();
  }

  private agendar(): void {
    if (this.agendado !== null) clearTimeout(this.agendado);
    this.agendado = setTimeout(() => {
      this.agendado = null;
      void this.salvarAgora();
    }, ESPERA_GRAVACAO);
  }

  /** Grava na hora, sem esperar. */
  async salvarAgora(): Promise<void> {
    if (this.agendado !== null) {
      clearTimeout(this.agendado);
      this.agendado = null;
    }
    // Encadeia para duas gravações nunca se atropelarem.
    this.gravando = this.gravando.then(async () => {
      try {
        await this.deposito.gravar(serializar(this.dados));
        this.erro = null;
      } catch (causa) {
        this.erro = causa instanceof Error ? causa.message : String(causa);
      }
    });
    return this.gravando;
  }

  /** Substitui tudo pelo conteúdo de um backup. */
  async restaurar(texto: string): Promise<DadosApp> {
    // Se o arquivo for inválido, desserializar lança antes de tocar no estado.
    this.dados = desserializar(texto);
    this.avisar();
    await this.salvarAgora();
    return this.dados;
  }

  /** Conteúdo para o usuário exportar. */
  exportar(): string {
    return serializar(this.dados);
  }

  async apagarTudo(): Promise<void> {
    this.dados = dadosIniciais();
    this.avisar();
    await this.deposito.apagar();
    await this.salvarAgora();
  }

  tamanhoGravado(): Promise<number> {
    return this.deposito.tamanho();
  }

  aoMudar(ouvinte: (dados: DadosApp) => void): () => void {
    this.ouvintes.add(ouvinte);
    return () => this.ouvintes.delete(ouvinte);
  }

  private avisar(): void {
    for (const ouvinte of this.ouvintes) ouvinte(this.dados);
  }
}
