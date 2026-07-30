import { bootstrapApplication } from '@angular/platform-browser';
import { Component, HostListener, output, signal } from '@angular/core';
import { NgClass } from '@angular/common';

type AnswerState = 'idle' | 'right' | 'wrong';
type Screen = 'intro' | 'quiz' | 'may23-arrival' | 'may23-embankment' | 'may23-fountain' | 'may23-library' | 'may31' | 'june06' | 'game' | 'challenge-complete' | 'surprise' | 'invitation';

const screens: readonly Screen[] = [
  'intro',
  'quiz',
  'may23-arrival',
  'may23-embankment',
  'may23-fountain',
  'may23-library',
  'may31',
  'june06',
  'game',
  'challenge-complete',
  'surprise',
  'invitation'
];

interface Point {
  readonly x: number;
  readonly y: number;
}

interface MoveDirection extends Point {
  readonly arrow: string;
}

interface GameState {
  readonly snake: readonly Point[];
  readonly applePositions: readonly Point[];
}

interface Question {
  readonly kicker: string;
  readonly text: string;
  readonly answers: readonly string[];
  readonly correctAnswer: string;
  readonly success: string;
  readonly hint: string;
}

interface ButtonPosition {
  readonly left: number;
  readonly top: number;
}

const questions: readonly Question[] = [
  {
    kicker: '18 мая 2026',
    text: 'Что я сказал, увидев твою фотографию?',
    answers: ['Боже. Да ты Богиня!', 'Какая ты красивая', 'Вот это фотография', 'Мне нравится твоя улыбка'],
    correctAnswer: 'Боже. Да ты Богиня!',
    success: 'И я ни капли не преувеличивал.',
    hint: 'В этой фразе было кое-что божественное.'
  },
  {
    kicker: 'Первая встреча в Кирове',
    text: 'Куда мы пошли после встречи?',
    answers: ['В «Дачу»', 'В кино', 'В парк', 'В кофейню'],
    correctAnswer: 'В «Дачу»',
    success: 'А во время прогулки ты рассказывала мне разные истории.',
    hint: 'Это было городское кафе.'
  },
  {
    kicker: 'Наш первый вечер',
    text: 'Что нам там понравилось больше всего?',
    answers: ['Облепиховый чай', 'Десерт', 'Кофе', 'Лимонад'],
    correctAnswer: 'Облепиховый чай',
    success: 'Тот самый облепиховый чай) Мы заказали его 3 раза!',
    hint: 'Он был яркий, тёплый и ягодный.'
  },
  {
    kicker: 'У фонтана',
    text: 'Какую «фатальную» ошибку я совершил?',
    answers: ['Не держи руки спереди у фонтана!', 'Сел слишком далеко', 'Предложил уйти слишком рано', 'Забыл включить музыку'],
    correctAnswer: 'Не держи руки спереди у фонтана!',
    success: 'Эту ошибку я точно запомнил 😄',
    hint: 'Всё дело было в том, где находились мои руки.'
  },
  {
    kicker: 'Песня у фонтана',
    text: 'А ещё ты говорила, как сильно тебе нравится фраза из песни. Что это была за фраза?',
    answers: [
		'Холодными металлами водил по своим венам. Но ты даже не подумала, что я был тебе предан.',
		'Страсть где нет души, может привести нас только к боли.',
		'Позову звёзды смотреть на тебя.',
		'Мальчик-айтишник, 300к в секунду.'],
    correctAnswer: 'Холодными металлами водил по своим венам. Но ты даже не подумала, что я был тебе предан.',
    success: 'Ты повторяла её не раз 😄',
    hint: 'Она была из песни «пополам (in half)».'
  },
  {
    kicker: '23 мая 2026',
    text: 'А помнишь, что ты сделала напоследок?',
    answers: ['Поцеловала меня в щёчку', 'Обняла меня', 'Помахала рукой', 'Сказала до встречи'],
    correctAnswer: 'Поцеловала меня в щёчку',
    success: 'А я потом ещё долго улыбался) А в такси играла MariaFM.',
    hint: 'Это был короткий, но очень тёплый момент.'
  },
  {
    kicker: '31 мая 2026',
    text: 'Что же между нам произошло?',
    answers: ['Первый поцелуй', 'Первая прогулка', 'Первое фото', 'Первый подарок'],
    correctAnswer: 'Первый поцелуй',
    success: 'Тот самый момент, который хочется прокрутить заново.',
    hint: 'После этого мы стали ещё чуточку ближе.'
  }
];
const runawayPhrases = [
  'Эй, не надо меня догонять 😄',
  'Хватит меня догонять)',
  'Я вообще-то против этой кнопки',
  'Нет? Не верю)',
  'Попробуй лучше кнопку рядом',
  'Я слишком быстрая для отказа',
  'Ладно-ладно, я просто спрячусь'
] as const;

const levelRows = [
  '           Д ',
  '           ББ',
  '   Я        Б',
  '   БП    Б  Б',
  ' Я      ББ  Б',
  '   БП  ЗЗГ  Б',
  '   ББББББББББ'
] as const;

const boardWidth = Math.max(...levelRows.map((row) => row.length));
const boardHeight = levelRows.length;

function findLevelCells(symbol: string): readonly Point[] {
  return levelRows.flatMap((row, y) =>
    [...row].flatMap((cell, x) => cell === symbol ? [{ x, y }] : [])
  );
}

const head = findLevelCells('Г')[0];
const initialSnake: readonly Point[] = [
  head,
  ...[...findLevelCells('З')].sort((first, second) => second.x - first.x)
];
const apples = findLevelCells('Я');
const bricks = findLevelCells('Б');
const saws = findLevelCells('П');
const target = findLevelCells('Д')[0];
const moveDirections: readonly MoveDirection[] = [
  { x: 0, y: -1, arrow: '↑' },
  { x: -1, y: 0, arrow: '←' },
  { x: 1, y: 0, arrow: '→' },
  { x: 0, y: 1, arrow: '↓' }
];

function samePoint(first: Point, second: Point): boolean {
  return first.x === second.x && first.y === second.y;
}

@Component({
  selector: 'app-snake-game',
  standalone: true,
  imports: [NgClass],
  template: `
    <div class="snake-game">
      <div class="game-copy">
        <p class="eyebrow">Мини-игра</p>
        <h2>А помнишь этот уровень?</h2>
        @if (showPathHints()) {
          <p class="hint game-hint">Я буду показывать следующую стрелку прямо на поле.</p>
        }
      </div>

      <div class="game-layout">
        <div
          class="game-board"
          aria-label="Поле змейки"
          [style.--board-columns]="columns.length"
          [style.--board-rows]="rows.length"
        >
          @for (row of rows; track row) {
            @for (column of columns; track column) {
              <span [ngClass]="cellClass(column, row)">
                @if (isApple(column, row)) {
                  <span class="apple-mark">●</span>
                }
                @if (isSaw(column, row)) {
                  <span class="saw-mark">✹</span>
                }
                @if (isTarget(column, row)) {
                  <span class="target-mark"></span>
                }
              </span>
            }
          }
          @if (currentPathHint(); as hint) {
            <span
              class="path-hint"
              [style.--x]="snake()[0].x"
              [style.--y]="snake()[0].y"
            >
              {{ hint }}
            </span>
          }
          @for (part of snake(); track $index; let index = $index) {
            <span
              class="worm-part"
              [class.worm-head]="index === 0"
              [style.--x]="part.x"
              [style.--y]="part.y"
              aria-hidden="true"
            ></span>
          }

          <div class="game-controls" aria-label="Управление змейкой">
            <button type="button" class="control up" aria-label="Вверх" (click)="move(0, -1)">↑</button>
            <button type="button" class="control left" aria-label="Влево" (click)="move(-1, 0)">←</button>
            <button type="button" class="control right" aria-label="Вправо" (click)="move(1, 0)">→</button>
            <button type="button" class="control down" aria-label="Вниз" (click)="move(0, 1)">↓</button>
          </div>
        </div>

        <div class="game-panel">
          @if (showPathHints()) {
            <p class="game-status game-status-help">
              Я рядом. Иди по стрелочкам на поле.
            </p>
          } @else {
            <p class="game-status">{{ status() }}</p>
          }

          @if (!won()) {
            <button
              type="button"
              class="help-button"
              [class.help-button-active]="showPathHints()"
              (click)="askForHelp()"
            >
              Дениска помоги!
            </button>
          }

          <button type="button" class="reset-button" (click)="reset()">Начать заново</button>

          @if (won()) {
            <button type="button" class="success-button" (click)="continueToSurprise()">
              Я умничка!
            </button>
          }
        </div>
      </div>
    </div>
  `
})
export class SnakeGameComponent {
  readonly completed = output<void>();

  protected readonly columns = Array.from({ length: boardWidth }, (_, index) => index);
  protected readonly rows = Array.from({ length: boardHeight }, (_, index) => index);
  protected readonly snake = signal<readonly Point[]>(initialSnake);
  protected readonly remainingApplePositions = signal<readonly Point[]>(apples);
  protected readonly status = signal('Доберись до яблок, наращивай длину и помни о гравитации.');
  protected readonly showPathHints = signal(false);
  protected readonly won = signal(false);
  protected readonly moving = signal(false);

  @HostListener('window:keydown', ['$event'])
  protected onKeydown(event: KeyboardEvent): void {
    const moves: Record<string, Point> = {
      ArrowUp: { x: 0, y: -1 },
      ArrowDown: { x: 0, y: 1 },
      ArrowLeft: { x: -1, y: 0 },
      ArrowRight: { x: 1, y: 0 },
      w: { x: 0, y: -1 },
      s: { x: 0, y: 1 },
      a: { x: -1, y: 0 },
      d: { x: 1, y: 0 }
    };
    const move = moves[event.key.toLowerCase()] ?? moves[event.key];

    if (!move) {
      return;
    }

    event.preventDefault();
    void this.move(move.x, move.y);
  }

  protected async move(deltaX: number, deltaY: number): Promise<void> {
    if (this.won() || this.moving()) {
      return;
    }

    const currentSnake = this.snake();
    const head = currentSnake[0];
    const nextHead = { x: head.x + deltaX, y: head.y + deltaY };

    if (this.isSaw(nextHead.x, nextHead.y)) {
      this.handleFailedMove(currentSnake);
      return;
    }

    if (this.isBlocked(nextHead, currentSnake)) {
      this.handleBlockedMove();
      return;
    }

    this.moving.set(true);

    const currentApplePositions = this.remainingApplePositions();
    const ateApple = this.isApple(nextHead.x, nextHead.y);
    const nextSnake = [nextHead, ...currentSnake];

    if (!ateApple) {
      nextSnake.pop();
    } else {
      this.remainingApplePositions.update((positions) => positions.filter((apple) => !samePoint(apple, nextHead)));
    }

    this.snake.set(nextSnake);
    await this.wait(170);

    if (samePoint(nextHead, target)) {
      this.finishLevel();
      return;
    }

    const fallenSnake = await this.applyGravity(nextSnake);

    if (!fallenSnake) {
      this.reset(this.showPathHints() ? 'Давай заново, ты пошла не туда, солнышко' : 'Попробуй ещё раз — теперь я покажу стрелки.', true);
      return;
    }

    if (samePoint(fallenSnake[0], target)) {
      this.finishLevel();
      return;
    }

    if (deltaY === -1 && fallenSnake[0].y >= head.y) {
      this.snake.set(currentSnake);
      this.remainingApplePositions.set(currentApplePositions);
      this.moving.set(false);
      this.status.set('Вверх так не получится. Нужна опора, чтобы подняться выше.');
      return;
    }

    if (this.showPathHints() && !this.findNextWinningMove({ snake: fallenSnake, applePositions: this.remainingApplePositions() })) {
      this.reset('Давай заново, ты пошла не туда, солнышко', true);
      return;
    }

    if (ateApple) {
      this.status.set('Яблоко съедено — змейка стала длиннее.');
    } else {
      this.status.set('Используй длину змейки как опору и помни о гравитации.');
    }

    this.moving.set(false);
  }

  protected reset(message = 'Доберись до яблок, наращивай длину и помни о гравитации.', showHints = this.showPathHints()): void {
    this.snake.set(initialSnake);
    this.remainingApplePositions.set(apples);
    this.won.set(false);
    this.moving.set(false);
    this.status.set(message);
    this.showPathHints.set(showHints);
  }

  protected continueToSurprise(): void {
    this.completed.emit();
  }

  protected askForHelp(): void {
    this.status.set('Я рядом. Иди по стрелочкам на поле.');
    this.showPathHints.set(true);
  }

  protected remainingApples(): number {
    return this.remainingApplePositions().length;
  }

  protected cellClass(x: number, y: number): Record<string, boolean> {
    return {
      cell: true,
      brick: this.isBrick(x, y),
      saw: this.isSaw(x, y),
      target: this.isTarget(x, y),
      apple: this.isApple(x, y)
    };
  }

  protected isApple(x: number, y: number): boolean {
    return this.remainingApplePositions().some((apple) => samePoint(apple, { x, y }));
  }

  protected isSaw(x: number, y: number): boolean {
    return saws.some((saw) => samePoint(saw, { x, y }));
  }

  protected isTarget(x: number, y: number): boolean {
    return samePoint(target, { x, y });
  }

  protected currentPathHint(): string | null {
    if (!this.showPathHints() || this.moving()) {
      return null;
    }

    return this.findNextWinningMove({ snake: this.snake(), applePositions: this.remainingApplePositions() })?.arrow ?? null;
  }

  private isBlocked(point: Point, snake: readonly Point[]): boolean {
    const outsideBoard = point.x < 0 || point.x >= boardWidth || point.y < 0 || point.y >= boardHeight;

    return outsideBoard || this.isBrick(point.x, point.y) || snake.some((part) => samePoint(part, point));
  }

  private handleFailedMove(currentSnake: readonly Point[]): void {
    if (this.showPathHints() && this.findNextWinningMove({ snake: currentSnake, applePositions: this.remainingApplePositions() })) {
      this.status.set('Я рядом. Иди по стрелочкам на поле.');
      return;
    }

    this.reset(this.showPathHints() ? 'Давай заново, ты пошла не туда, солнышко' : 'Попробуй ещё раз — теперь я покажу стрелки.', true);
  }

  private handleBlockedMove(): void {
    if (this.showPathHints()) {
      this.status.set('Я рядом. Иди по стрелочкам на поле.');
      return;
    }

    this.status.set('Туда двигаться нельзя. Попробуй другой путь.');
  }

  private findNextWinningMove(initialState: GameState): MoveDirection | null {
    const queue: { state: GameState; firstMove: MoveDirection | null }[] = [{ state: initialState, firstMove: null }];
    const visited = new Set<string>([this.serializeState(initialState)]);

    for (let index = 0; index < queue.length && index < 12000; index++) {
      const current = queue[index];

      for (const direction of this.availableMoveDirections(current.state.snake)) {
        const next = this.simulateMove(current.state, direction);

        if (next === 'won') {
          return current.firstMove ?? direction;
        }

        if (!next) {
          continue;
        }

        const key = this.serializeState(next);

        if (visited.has(key)) {
          continue;
        }

        visited.add(key);
        queue.push({ state: next, firstMove: current.firstMove ?? direction });
      }
    }

    return null;
  }

  private simulateMove(state: GameState, direction: MoveDirection): GameState | 'won' | null {
    const currentSnake = state.snake;
    const nextHead = { x: currentSnake[0].x + direction.x, y: currentSnake[0].y + direction.y };

    if (this.isSaw(nextHead.x, nextHead.y) || this.isBlocked(nextHead, currentSnake)) {
      return null;
    }

    const ateApple = state.applePositions.some((apple) => samePoint(apple, nextHead));
    const nextApplePositions = ateApple ? state.applePositions.filter((apple) => !samePoint(apple, nextHead)) : state.applePositions;
    const nextSnake = [nextHead, ...currentSnake];

    if (!ateApple) {
      nextSnake.pop();
    }

    if (samePoint(nextHead, target)) {
      return 'won';
    }

    const fallenSnake = this.applyGravityToState(nextSnake, nextApplePositions);

    if (!fallenSnake) {
      return null;
    }

    if (samePoint(fallenSnake[0], target)) {
      return 'won';
    }

    if (direction.y === -1 && fallenSnake[0].y >= currentSnake[0].y) {
      return null;
    }

    return { snake: fallenSnake, applePositions: nextApplePositions };
  }

  private availableMoveDirections(snake: readonly Point[]): readonly MoveDirection[] {
    const neck = snake[1];

    if (!neck) {
      return moveDirections;
    }

    const head = snake[0];

    return moveDirections.filter((direction) => !samePoint({ x: head.x + direction.x, y: head.y + direction.y }, neck));
  }

  private applyGravityToState(snake: readonly Point[], applePositions: readonly Point[]): readonly Point[] | null {
    let fallingSnake = snake.map((part) => ({ ...part }));

    while (!fallingSnake.some((part) => this.isStateSupport(part.x, part.y + 1, applePositions))) {
      fallingSnake = fallingSnake.map((part) => ({ x: part.x, y: part.y + 1 }));

      if (fallingSnake.some((part) => part.y >= boardHeight || this.isSaw(part.x, part.y))) {
        return null;
      }
    }

    return fallingSnake;
  }

  private isStateSupport(x: number, y: number, applePositions: readonly Point[]): boolean {
    return this.isBrick(x, y) || applePositions.some((apple) => samePoint(apple, { x, y }));
  }

  private serializeState(state: GameState): string {
    const snakeKey = state.snake.map((part) => `${part.x},${part.y}`).join('|');
    const applesKey = [...state.applePositions]
      .map((apple) => `${apple.x},${apple.y}`)
      .sort()
      .join('|');

    return `${snakeKey};${applesKey}`;
  }

  private async applyGravity(snake: readonly Point[]): Promise<readonly Point[] | null> {
    let fallingSnake = snake.map((part) => ({ ...part }));

    while (!fallingSnake.some((part) => this.isSupport(part.x, part.y + 1))) {
      fallingSnake = fallingSnake.map((part) => ({ x: part.x, y: part.y + 1 }));
      this.snake.set(fallingSnake);
      await this.wait(140);

      if (fallingSnake.some((part) => part.y >= boardHeight || this.isSaw(part.x, part.y))) {
        return null;
      }
    }

    return fallingSnake;
  }

  private finishLevel(): void {
    this.won.set(true);
    this.moving.set(false);
    this.status.set('Дыра достигнута. Уровень пройден!');
  }

  private isSupport(x: number, y: number): boolean {
    return this.isBrick(x, y) || this.isApple(x, y);
  }

  private wait(milliseconds: number): Promise<void> {
    return new Promise((resolve) => window.setTimeout(resolve, milliseconds));
  }

  private isBrick(x: number, y: number): boolean {
    return bricks.some((brick) => samePoint(brick, { x, y }));
  }

}

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [NgClass, SnakeGameComponent],
  template: `
    <main class="page-shell">
      <div class="little-heart" aria-hidden="true">♥</div>

      @if (screen() === 'intro') {
        <section class="card intro-card">
          <span class="paper-tape" aria-hidden="true"></span>
          <div class="intro-date">18 · 05 · 2026</div>

          <div class="intro-letter">
            <h1>Привет, малыш)</h1>
            <p>
              Когда ты впервые написала мне эти слова, я сказал, что ты нашла ключик
              к моему сердцу.
            </p>
            <p>
              Я собрал здесь несколько наших приятных и запомниющихся моментов.
            </p>
            <p>Давай пройдем этот путь ещё раз?</p>
          </div>

          <div class="intro-footer">
            <button type="button" class="primary-button" (click)="startQuiz()">
              Конечно, пупсик 😄
            </button>
          </div>

          <div class="tiny-key" aria-hidden="true">
            <span></span>
          </div>
        </section>
      }

      @if (screen() === 'quiz') {
        <section class="card quiz-card" aria-live="polite">
          <div class="progress" aria-label="Прогресс вопросов">
            @for (question of questions; track question.kicker; let index = $index) {
              <span [class.done]="index <= questionIndex()"></span>
            }
          </div>

          <p class="eyebrow">{{ currentQuestion().kicker }}</p>
          <h2 class="question-title">{{ currentQuestion().text }}</h2>

          @if (currentQuestion().kicker === 'У фонтана') {
            <div class="fountain-scene" aria-hidden="true">
              <span class="fountain-glow"></span>
              <span class="water-jet jet-center"></span>
              <span class="water-jet jet-left"></span>
              <span class="water-jet jet-right"></span>
              <span class="water-arc arc-left"></span>
              <span class="water-arc arc-center"></span>
              <span class="water-arc arc-right"></span>
              <span class="water-drop drop-left"></span>
              <span class="water-drop drop-center"></span>
              <span class="water-drop drop-right"></span>
              <span class="water-mist mist-left"></span>
              <span class="water-mist mist-center"></span>
              <span class="water-mist mist-right"></span>
              <span class="water-spark spark-left"></span>
              <span class="water-spark spark-center"></span>
              <span class="water-spark spark-right"></span>
              <span class="fountain-stem"></span>
              <span class="fountain-bowl"></span>
              <span class="fountain-base"></span>
            </div>
          }

          <div class="answers" role="group" aria-label="Варианты ответа">
            @for (answer of shuffledAnswers(currentQuestion()); track answer) {
              <button type="button" [ngClass]="answerClass(answer)" (click)="chooseAnswer(answer)">
                {{ answer }}
              </button>
            }
          </div>

          @if (answerState() === 'wrong') {
            <p class="hint">{{ currentQuestion().hint }}</p>
          }

          @if (answerState() === 'right') {
            <div class="warm-note">
              <p>{{ currentQuestion().success }}</p>
              <button type="button" class="primary-button" (click)="nextStep()">
                {{ isLastQuestion() ? 'К самому важному дню' : 'Дальше' }}
              </button>
            </div>
          }
        </section>
      }

      @if (screen() === 'may23-arrival') {
        <section class="card intro-card memory-card">
          <span class="paper-tape" aria-hidden="true"></span>
          <div class="intro-date">23 · 05 · 2026</div>

          <div class="intro-letter">
            <h1>Первая встреча</h1>
            <p>
              В тот день я впервые приехал к тебе в Киров и встретил тебя после работы.
              Когда я увидел тебя, то подумал только об одном: какая же ты красивая 💋
            </p>
            <p>
              На мне была белая футболка и чёрные штаны. А ты была одета в синий костьюм
              и выглядела прекрасно.
            </p>
            <p>
              Ты потянулась ко мне, чтобы обнять. Я немного удивился, но очень обрадовался
              и нежно обнял тебя в ответ.
            </p>
            <p>
              А потом мы вместе отправились в уютное место. Помнишь, куда именно?
            </p>
          </div>

          <div class="intro-footer">
            <button type="button" class="primary-button" (click)="continueAfterArrival()">
              Конечно, помню)
            </button>
          </div>
        </section>
      }

      @if (screen() === 'may23-embankment') {
        <section class="card intro-card memory-card">
          <span class="paper-tape" aria-hidden="true"></span>
          <div class="intro-date">23 · 05 · 2026</div>

          <div class="intro-letter">
            <h1>Прогулка по набережной</h1>
            <p>
              После кафе мы направились на прогулку по набережной. Мы просто гуляли
              и общались.
            </p>
            <p>
              Неприятных мух вспоминать не будем — мы от них просто убежали 😄
            </p>
            <p>
              А потом пошли в сторону Театральной площади.
            </p>
          </div>

          <div class="intro-footer">
            <button type="button" class="primary-button" (click)="continueAfterEmbankment()">
              Пойдём дальше)
            </button>
          </div>
        </section>
      }

      @if (screen() === 'may23-fountain') {
        <section class="card intro-card memory-card">
          <span class="paper-tape" aria-hidden="true"></span>
          <div class="intro-date">23 · 05 · 2026</div>

          <div class="intro-letter">
            <h1>Театральная площадь</h1>
            <p>
              Потом мы пошли на Театральную площадь и сидели у фонтана, слушая музыку.
            </p>
            <p>
              Мы увидели, как люди фотографируются у фонтана, и решили последовать
              их примеру. Я же хорошо позировал?
            </p>
          </div>

          <div class="intro-footer">
            <button type="button" class="primary-button" (click)="continueAfterFountain()">
              Конечно 😄
            </button>
          </div>
        </section>
      }

      @if (screen() === 'may23-library') {
        <section class="card intro-card memory-card">
          <span class="paper-tape" aria-hidden="true"></span>
          <div class="intro-date">23 · 05 · 2026</div>

          <div class="intro-letter">
            <h1>До следующей недели…</h1>
            <p>
              Перед тем как пришла пора прощаться, мы сидели у библиотеки, и ты сказала мне:
            </p>

            <blockquote class="memory-quote">
              «Ты ведьма, мотаешь время»
            </blockquote>

            <p>Это было забавно)</p>

            <p>
              Потом мы дошли до фонтанчиков в парке и немного посидели на скамейке.
            </p>

            <p>
              После пришла пора ненадолго расстаться — до следующей недели.
              Я знал, что мы встретимся снова. И уже тогда точно понимал,
              что хочу быть только с тобой.
            </p>
          </div>

          <div class="intro-footer">
            <button type="button" class="primary-button" (click)="continueAfterLibrary()">
              А дальше?)
            </button>
          </div>
        </section>
      }

      @if (screen() === 'may31') {
        <section class="card intro-card memory-card">
          <span class="paper-tape" aria-hidden="true"></span>
          <div class="intro-date">31 · 05 · 2026</div>

          <div class="intro-letter">
            <h1>Твой первый приезд ко мне</h1>
            <p>
              Я снял для тебя отдельную квартиру и сам спал на диване. Массировал тебе ножки.
            </p>
            <p>
              А утром очень хотелось порадовать тебя, пока ты ещё спала. Хоп —
              а у тебя уже горячий шоколад и булочки рядом)
            </p>

            <div class="memory-route" aria-label="Наш день">
              <span>Танец</span>
              <i>→</i>
              <span>Объятия</span>
              <i>→</i>
              <span>Прогулка</span>
            </div>

            <p>
              Мы потанцевали в центре комнаты, а затем лежали на кровати, обнимаясь.
              Потом пошли ко мне и немного прогулялись.
            </p>
            <p class="memory-ending">
              А уже у меня дома случился момент, который я особенно берегу.
            </p>
          </div>

          <div class="intro-footer">
            <button type="button" class="primary-button" (click)="continueAfterMay31()">
              Вспомнить его)
            </button>
          </div>
        </section>
      }

      @if (screen() === 'june06') {
        <section class="card intro-card memory-card">
          <span class="paper-tape" aria-hidden="true"></span>
          <div class="intro-date">06 · 06 · 2026</div>

          <div class="intro-letter">
            <h1>День, когда я решился</h1>
            <p>
              К тому моменту я уже не сомневался. Мне хотелось, чтобы между нами
              было что-то настоящее, не на один день и не просто «посмотрим».
            </p>
            <p>
              Я предложил тебе встречаться, а ты согласилась. И тогда я стал самым
              счастливым человеком на свете.
            </p>
          </div>

          <div class="intro-footer">
            <button type="button" class="primary-button" (click)="continueAfterJune06()">
              К маленькому испытанию
            </button>
          </div>
        </section>
      }

      @if (screen() === 'game') {
        <section class="card game-card">
          <app-snake-game (completed)="unlockInvitation()" />
        </section>
      }

      @if (screen() === 'challenge-complete') {
        <section class="card intro-card memory-card">
          <span class="paper-tape" aria-hidden="true"></span>
          <div class="intro-date">Испытание пройдено</div>

          <div class="intro-letter">
            <h1>Ура, ты справилась!</h1>
            <p>
              Я знал, что ты справишься. А дальше у меня для тебя ещё кое-что важное.
            </p>
          </div>

          <div class="intro-footer">
            <button type="button" class="primary-button" (click)="continueAfterChallenge()">
              К сюрпризу)
            </button>
          </div>
        </section>
      }

      @if (screen() === 'surprise') {
        <section class="card intro-card memory-card">
          <span class="paper-tape" aria-hidden="true"></span>
          <div class="intro-date">Сейчас</div>

          <div class="intro-letter">
            <h1>Наконец-то мы вместе</h1>
            <p>
              Все эти поездки по четыре часа и возвращения обратно к себе домой
              наконец подходят к концу.
            </p>
            <p>
              Потому что теперь мы съезжаемся.
            </p>
            <p>
              И у меня для тебя небольшой сюрприз.
            </p>
          </div>

          <div class="intro-footer">
            <button type="button" class="primary-button" (click)="openInvitation()">
              Открыть сюрприз)
            </button>
          </div>
        </section>
      }

      @if (screen() === 'invitation') {
        <section class="card invitation" aria-live="polite">
          <p class="eyebrow">01.08.2026 · Киров</p>
          <h1>Приглашение</h1>
          <p>
            Мы с тобой говорили, что хотели бы повторить нашу первую встречу.
            Пока мы не переехали, я хочу осуществить это наше небольшое желание.
          </p>
          <div class="invitation-detail">
            <span>Дача · городское кафе</span>
            <strong>1 августа · 17:00–19:00. Хочу снова провести с тобой время, предаваясь воспоминаниям и наслаждаясь друг другом.</strong>
          </div>
          <p class="closing-line">
            Облепиховый чай берём обязательно)
          </p>

          <div class="date-question">
            <h2>Ты согласна?</h2>

            @if (accepted()) {
              <p class="accepted-note">Я очень рад, что ты согласилась, любовь моя ❤️</p>
            } @else {
              <div class="date-actions">
                <button type="button" class="primary-button yes-button" (click)="acceptInvite()">
                  ДА!!!
                </button>
                <button
                  type="button"
                  class="no-button"
                  [class.runaway]="noButtonEscaped()"
                  [style.left.px]="noButtonPosition().left"
                  [style.top.px]="noButtonPosition().top"
                  (mouseenter)="moveNoButton()"
                  (focus)="moveNoButton()"
                  (touchstart)="moveNoButton()"
                  (click)="moveNoButton()"
                >
                  Нет
                </button>
              </div>

              @if (noButtonEscaped()) {
                <p class="runaway-comment">{{ runawayComment() }}</p>
              }
            }
          </div>
        </section>
      }
    </main>
  `
})
export class AppComponent {
  protected readonly questions = questions;
  protected readonly screen = signal<Screen>('intro');
  protected readonly questionIndex = signal(0);
  protected readonly selectedAnswer = signal<string | null>(null);
  protected readonly answerState = signal<AnswerState>('idle');
  protected readonly accepted = signal(false);
  protected readonly noButtonEscaped = signal(false);
  protected readonly noButtonPosition = signal<ButtonPosition>({ left: 0, top: 0 });
  protected readonly runawayComment = signal<string>(runawayPhrases[0]);

  constructor() {
    const params = new URLSearchParams(window.location.search);
    const savedScreen = params.get('step');
    const savedQuestion = Number(params.get('question'));

    if (Number.isInteger(savedQuestion) && savedQuestion >= 0 && savedQuestion < questions.length) {
      this.questionIndex.set(savedQuestion);
    }

    if (savedScreen && screens.includes(savedScreen as Screen)) {
      this.screen.set(savedScreen as Screen);
    }
  }

  protected startQuiz(): void {
    this.openQuestion(0);
  }

  protected currentQuestion(): Question {
    return questions[this.questionIndex()];
  }

  protected shuffledAnswers(question: Question): readonly string[] {
    return [...question.answers].sort((first, second) => this.answerHash(first) - this.answerHash(second));
  }

  protected chooseAnswer(answer: string): void {
    if (this.answerState() === 'right') {
      return;
    }

    this.selectedAnswer.set(answer);
    this.answerState.set(answer === this.currentQuestion().correctAnswer ? 'right' : 'wrong');
  }

  protected isLastQuestion(): boolean {
    return this.questionIndex() === questions.length - 1;
  }

  protected nextStep(): void {
    if (this.questionIndex() === 0) {
      this.openScreen('may23-arrival');
      return;
    }

    if (this.questionIndex() === 2) {
      this.openScreen('may23-embankment');
      return;
    }

    if (this.questionIndex() === 4) {
      this.openScreen('may23-library');
      return;
    }

    if (this.questionIndex() === 5) {
      this.openScreen('may31');
      return;
    }

    if (this.questionIndex() === 6) {
      this.openScreen('june06');
      return;
    }

    if (this.isLastQuestion()) {
      this.openScreen('game');
      return;
    }

    this.openQuestion(this.questionIndex() + 1);
  }

  protected continueAfterArrival(): void {
    this.openQuestion(1);
  }

  protected continueAfterEmbankment(): void {
    this.openScreen('may23-fountain');
  }

  protected continueAfterFountain(): void {
    this.openQuestion(3);
  }

  protected continueAfterLibrary(): void {
    this.openQuestion(5);
  }

  protected continueAfterMay31(): void {
    this.openQuestion(6);
  }

  protected continueAfterJune06(): void {
    this.openScreen('game');
  }

  protected unlockInvitation(): void {
    this.openScreen('challenge-complete');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  protected continueAfterChallenge(): void {
    this.openScreen('surprise');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  protected openInvitation(): void {
    this.openScreen('invitation');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  protected acceptInvite(): void {
    this.accepted.set(true);
  }

  protected moveNoButton(): void {
    const buttonWidth = 86;
    const buttonHeight = 46;
    const padding = 14;
    const maxLeft = Math.max(padding, window.innerWidth - buttonWidth - padding);
    const maxTop = Math.max(padding, window.innerHeight - buttonHeight - padding);
    const current = this.noButtonPosition();
    let next = this.randomButtonPosition(maxLeft, maxTop, padding);

    while (Math.abs(next.left - current.left) < 120 && Math.abs(next.top - current.top) < 90) {
      next = this.randomButtonPosition(maxLeft, maxTop, padding);
    }

    this.noButtonEscaped.set(true);
    this.noButtonPosition.set(next);
    this.runawayComment.set(runawayPhrases[Math.floor(Math.random() * runawayPhrases.length)]);
  }

  protected answerClass(answer: string): Record<string, boolean> {
    const isSelected = this.selectedAnswer() === answer;

    return {
      answer: true,
      selected: isSelected,
      correct: isSelected && this.answerState() === 'right',
      incorrect: isSelected && this.answerState() === 'wrong'
    };
  }

  private answerHash(answer: string): number {
    let hash = 0;

    for (let index = 0; index < answer.length; index++) {
      hash = (hash * 31 + answer.charCodeAt(index)) >>> 0;
    }

    return hash;
  }

  private openQuestion(index: number): void {
    this.questionIndex.set(index);
    this.selectedAnswer.set(null);
    this.answerState.set('idle');
    this.openScreen('quiz');
  }

  private openScreen(screen: Screen): void {
    this.screen.set(screen);

    const url = new URL(window.location.href);
    url.searchParams.set('step', screen);

    if (screen === 'quiz') {
      url.searchParams.set('question', String(this.questionIndex()));
    } else {
      url.searchParams.delete('question');
    }

    window.history.replaceState(null, '', url.toString());
  }

  private randomButtonPosition(maxLeft: number, maxTop: number, padding: number): ButtonPosition {
    return {
      left: Math.floor(padding + Math.random() * (maxLeft - padding)),
      top: Math.floor(padding + Math.random() * (maxTop - padding))
    };
  }
}

bootstrapApplication(AppComponent).catch((error) => console.error(error));
