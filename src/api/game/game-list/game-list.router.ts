/* eslint-disable @typescript-eslint/naming-convention */
/* eslint-disable import/no-default-export */
import { Router } from 'express';

import { AnagramController } from './anagram/anagram.controller';
import { MazeChaseController } from './maze-chase/maze-chase.controller';
import { PairOrNoPairController } from './pair-or-no-pair/pair-or-no-pair.controller';
import { QuizController } from './quiz/quiz.controller';
import { SlidingPuzzleController } from './sliding-puzzle/sliding-puzzle.controller';
import { SpeedSortingController } from './speed-sorting/speed-sorting.controller';
import { TrueOrFalseController } from './true-or-false/true-or-false.controller';
import { TypeSpeedController } from './type-speed/type-speed.controller';
import { WinOrLoseQuizController } from './win-or-lose-quiz/win-or-lose-quiz.controller';

const GameListRouter = Router();

GameListRouter.use('/quiz', QuizController);
GameListRouter.use('/maze-chase', MazeChaseController);
GameListRouter.use('/sliding-puzzle', SlidingPuzzleController);
GameListRouter.use('/speed-sorting', SpeedSortingController);
GameListRouter.use('/anagram', AnagramController);
GameListRouter.use('/pair-or-no-pair', PairOrNoPairController);
GameListRouter.use('/type-speed', TypeSpeedController);
GameListRouter.use('/true-or-false', TrueOrFalseController);
GameListRouter.use('/win-or-lose-quiz', WinOrLoseQuizController);

export default GameListRouter;
