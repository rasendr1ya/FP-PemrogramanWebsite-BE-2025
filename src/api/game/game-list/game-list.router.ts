/* eslint-disable @typescript-eslint/naming-convention */
/* eslint-disable import/no-default-export */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
import { Router } from 'express';

import airplaneRouter from './airplane/airplane.router';
import { AnagramController } from './anagram/anagram.controller';
import { CrosswordController } from './crossword/crossword.controller';
import { FindTheMatchController } from './find-the-match/find-the-match.controller';
import { HangmanController } from './hangman/hangman.controller';
import { MathGeneratorController } from './math-generator/math-generator.controller';
import { MazeChaseController } from './maze-chase/maze-chase.controller';
import { PairOrNoPairController } from './pair-or-no-pair/pair-or-no-pair.controller';
import { QuizController } from './quiz/quiz.controller';
import { SlidingPuzzleController } from './sliding-puzzle/sliding-puzzle.controller';
import { SpeedSortingController } from './speed-sorting/speed-sorting.controller';
import { SpinTheWheelController } from './spin-the-wheel/spin-the-wheel.controller';
import { TrueOrFalseController } from './true-or-false/true-or-false.controller';
import { TypeSpeedController } from './type-speed/type-speed.controller';
import { TypeTheAnswerController } from './type-the-answer/type-the-answer.controller';
import { WhackAMoleController } from './whack-a-mole/whack-a-mole.controller';
import { WinOrLoseQuizController } from './win-or-lose-quiz/win-or-lose-quiz.controller';

const gameListRouter = Router();

gameListRouter.use('/quiz', QuizController);
gameListRouter.use('/maze-chase', MazeChaseController);
gameListRouter.use('/sliding-puzzle', SlidingPuzzleController);
gameListRouter.use('/speed-sorting', SpeedSortingController);
gameListRouter.use('/anagram', AnagramController);
gameListRouter.use('/type-the-answer', TypeTheAnswerController);
// eslint-disable-next-line @typescript-eslint/no-unsafe-argument
gameListRouter.use('/crossword', CrosswordController);
gameListRouter.use('/find-the-match', FindTheMatchController);
gameListRouter.use('/hangman', HangmanController);
gameListRouter.use('/pair-or-no-pair', PairOrNoPairController);
gameListRouter.use('/type-speed', TypeSpeedController);

gameListRouter.use('/airplane', airplaneRouter);
gameListRouter.use('/whack-a-mole', WhackAMoleController);
gameListRouter.use('/spin-the-wheel', SpinTheWheelController);
gameListRouter.use('/true-or-false', TrueOrFalseController);
gameListRouter.use('/win-or-lose-quiz', WinOrLoseQuizController);
gameListRouter.use('/math-generator', MathGeneratorController);

export { gameListRouter };
