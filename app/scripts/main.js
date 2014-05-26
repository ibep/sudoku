/**
 * A Javascript implementation of a Sudoku game, including a
 * backtracking algorithm solver. For example usage see the
 * attached index.html demo.
 *
 * @author Moriel Schottlender
 */
var Sudoku = ( function ( $ ){
    var _instance, _game,
        /**
         * Default configuration options. These can be overriden
         * when loading a game instance.
         * @property {Object}
         */
        defaultConfig = {
            // If set to true, the game will validate the numbers
            // as the player inserts them. If it is set to false,
            // validation will only happen at the end.
            'validate_on_insert': true,
            // If set to true, the system will display the elapsed
            // time it took for the solver to finish its operation.
            'show_solver_timer': true,
            // If set to true, the recursive solver will count the
            // number of recursions and backtracks it performed and
            // display them in the console.
            'show_recursion_counter': true,
            // If set to true, the solver will test a shuffled array
            // of possible numbers in each empty input box.
            // Otherwise, the possible numbers are ordered, which
            // means the solver will likely give the same result
            // when operating in the same game conditions.
            'solver_shuffle_numbers': true,
            // Difficulty level for starting the table
            // Possible levels: easier, easy, medium, hard, harder, extreme
            'difficulty_level': 'easy'
        },
        paused = false,
        counter = 0;

    /**
     * Initialize the singleton
     * @param {Object} config Configuration options
     * @returns {Object} Singleton methods
     */
    function init( config ) {
        conf = $.extend( {}, defaultConfig, config );
        _game = new Game( conf );

        /** Public methods **/
        return {
            /**
             * Return a visual representation of the board
             * @returns {jQuery} Game table
             */
            getGameBoard: function() {
                return _game.buildGUI();
            },

            /**
             * Reset the game board.
             */
            reset: function() {
                _game.resetGame();
            },

            /**
             * Call for a validation of the game board.
             * @returns {Boolean} Whether the board is valid
             */
            validate: function() {
                var isValid;

                isValid = _game.validateMatrix();
                $( '.sudoku-container' ).toggleClass( 'valid-matrix', isValid );
            },

            /**
             * Call for the solver routine to solve the current
             * board.
             */
            solve: function() {
                var isValid, starttime, endtime, elapsed;
                // Make sure the board is valid first
                if ( !_game.validateMatrix() ) {
                    return false;
                }
                // Reset counters
                _game.recursionCounter = 0;
                _game.backtrackCounter = 0;

                // Check start time
                starttime = Date.now();

                // Solve the game
                isValid = _game.solveGame( 0, 0 );

                // Get solving end time
                endtime = Date.now();

                // Visual indication of whether the game was solved
                $( '.sudoku-container' ).toggleClass( 'valid-matrix', isValid );
                if ( isValid ) {
                    $( '.valid-matrix input' ).attr( 'disabled', 'disabled' );
                }

                // Display elapsed time
                if ( _game.config.show_solver_timer ) {
                    elapsed = endtime - starttime;
                    window.console.log( 'Solver elapsed time: ' + elapsed + 'ms' );
                }
                // Display number of reursions and backtracks
                if ( _game.config.show_recursion_counter ) {
                    window.console.log( 'Solver recursions: ' + _game.recursionCounter );
                    window.console.log( 'Solver backtracks: ' + _game.backtrackCounter );
                }
            }
        };
    }

    /**
     * Sudoku singleton engine
     * @param {Object} config Configuration options
     */
    function Game( config ) {
        this.config = config;

        // Initialize game parameters
        this.recursionCounter = 0;
        this.$cellMatrix = {};
        this.matrix = {};
        this.validation = {};

        this.resetValidationMatrices();
        return this;
    }
    /**
     * Game engine prototype methods
     * @property {Object}
     */
    Game.prototype = {
        /**
         * Build the game GUI
         * @returns {jQuery} Table containing 9x9 input matrix
         */
        buildGUI: function() {
            var $td, $tr,
                $table = $( '<table>' )
                    .addClass( 'sudoku-container table table-bordered' ),
                levelString = this.config.difficulty_level.toString(),
                difficulty = {
                    easier: [
                      '040730800007090305036480000210500000000000000000008012000074280604050700008013090',
                      '502001009100000040000485007000009078069000450470300000300974000090000001700600504',
                      '040031069007000045030400000200000670800000003075000002000004080690000700720610090',
                      '400000062000004001002509040304000500200806007005000206040608100500200000920000008',
                      '000300902600004001180000740000100089000856000870003000043000025500200004906005000',
                      '050000080410097000006050903000000092395208471640000000501020800000910057030000020',
                      '000400070170900082600500040000049300900356008006270000060005001810004029090002000'
                    ],   
                    easy: [
                      '057081002030000000000500040304070580290000037075040206040008000000000090900410370',
                      '000000002609704000082500043300002500000806000005900006740008120000207604900000000',
                      '500030000210004300034700800743060002009020500800070634008009250005300091000050008',
                      '502001000000000040030080007200009078800107003470300002300070080090000000000600504',
                      '000001809187090300906480007010009000009020400000300010300074206004050731708600000',
                      '500700009000200340000005120010040608009000400405060010051900000094002000700003004',
                      '000700860100200040000485000003009670009000400075300900000974000090002001028003000',
                      '007000060630000801080500000004070589001050400875040200000008020508000094020000300'
                    ], 
                    medium: [
                      '002001060000206300000085107210509000060000050000308012301970000004802000020600500',
                      '002700000000000045900085007210540000000020000000068012300970006690000000000003500',
                      '000301060630020850002500040300000500290000037005000006040008100018030094020405000',
                      '200600704003800060080052000100045000090000070000170008000720040020006300907004006',
                      '003006040040307001897200000070000003031000470500000010000008257300705090080900300',
                      '040000091500001002000040700012008000900030005000900120009080000600300004250000060',
                      '000900370000052006913007000800000600050030010009000003000100782100580000086009000',
                      '000040000956000000000010079085400700340050062002001450820060000000000185000090000',
                      '300040600002390100650010070006000740000060000025000900040030015007051300003020007',
                    ],
                    hard: [
                      '000006072000007650620005890000080040006203900080070000069400027042700000750900000',
                      '080040600072090000609210000006000042730000081820000900000037205000050390003020060',
                      '600000008750004000002670000491500000080030040000008157000042700000800034900000002',
                      '040000008000080001802005090000507380007000200026408000030900705200060000900000010',
                      '050600000000090205706000000170345602300060001602179038000000809804010000000004020',
                      '000500610001800004060000598100008060506020801090600003974000050600005400085009000',
                      '008500090500004703006903004001600800000080000003001400200305600307100002050006300',
                      '408007090000800700000000504001030005700409006600050400209000000007008000050200307',
                      '000000002050803070002560010305100700000070000004005209040052100090608030500000000'
                    ],
                    harder: [
                      '806700090000000004000500813005190008000204000700085200643002000200000000080007906',
                      '005300709092000500000007060003609008000204000900105400060400000004000920508002300',
                      '008560090092800060100003000901600070000000000080001409000300008060008950050096300',
                      '020039040905070036430000007000200300000050000002007000800000064740080502050790010',
                      '100650409002007000000100080009008060200305008040900500080006000000500700605079004',
                      '080020304340000009000400570900600800051090740004007002015004000700000085408070090',
                      '080040609072000108000008070100503000000962000000104006040600000207000390503020060',
                      '050301062000700050180009043060002009000050000800900010740600025010007000920405070',
                      '003200570000080001002005003490500006507000209300008057100900700200060000064003800'
                    ],
                    extreme: [
                      '500001060080206040000000107013009008000127000400300910301000000090802030020600004',
                      '000700069000006300000085120010000608009020400405000010051970000004800000720003000',
                      '807520000000000402000049050002000940900030005085000100030280000601000000000017309',
                      '000600109000000070030705020700060002060423080800070004070109050020000000301007000',
                      '007009100000400030000062900089000370104000609062000480001320000040001000006700800',
                      '000000100010070006008062050009006001000803000300900400090320700700080090006000000',
                      '600000000010070036000100957089206000000050000000907480891005000740080090000000003',
                      '000700620400090050009008070090080740000060000025070030040600200060050004013009000'
                    ]
                },
                level, rows, row, col;

            // Randomize inside each level
            while (difficulty[levelString][level] === undefined){
              level = getRandomInt(0, 9);
            }
            // Set the board level
            level = difficulty[levelString][level].toString();
            rows = level.match(/.{1,9}/g);
            for ( var i = 0; i < 9; i++ ) {
                $tr = $( '<tr>' );
                this.$cellMatrix[i] = {};
                row = rows[i];

                for ( var j = 0; j < 9; j++ ) {
                    // Build the input
                    this.$cellMatrix[i][j] = $( '<input>' )
                        .attr( 'maxlength', 1 )
                        .addClass('form-control')
                        .data( 'row', i )
                        .data( 'col', j )
                        .on( 'keyup', $.proxy( this.onKeyUp, this ) );

                    col = parseFloat(row.charAt(j));
                    if (col !== 0) {
                      this.$cellMatrix[i][j].val(col);
                    }

                    $td = $( '<td>' ).append( this.$cellMatrix[i][j] );
                    // Calculate section ID
                    sectIDi = Math.floor( i / 3 );
                    sectIDj = Math.floor( j / 3 );
                    // Set the design for different sections
                    if ( ( sectIDi + sectIDj ) % 2 === 0 ) {
                        $td.addClass( 'sudoku-section-one' );
                    } else {
                        $td.addClass( 'sudoku-section-two' );
                    }
                    // Build the row
                    $tr.append( $td );
                }
                // Append to table
                $table.append( $tr );
            }
            // Return the GUI table
            return $table;
        },

        /**
         * Handle keyup events.
         *
         * @param {jQuery.event} e Keyup event
         */
        onKeyUp: function( e ) {
            var sectRow, sectCol, secIndex,
                starttime, endtime, elapsed,
                isValid = true,
                val = $.trim( $( e.currentTarget ).val() ),
                row = $( e.currentTarget ).data( 'row' ),
                col = $( e.currentTarget ).data( 'col' );

            // Reset board validation class
            $( '.sudoku-container' ).removeClass( 'valid-matrix' );

            // Validate, but only if validate_on_insert is set to true
            if ( this.config.validate_on_insert ) {
                isValid = this.validateNumber( val, row, col, this.matrix.row[row][col] );
                // Indicate error
                $( e.currentTarget ).toggleClass( 'sudoku-input-error', !isValid );
            }

            // Calculate section identifiers
            sectRow = Math.floor( row / 3 );
            sectCol = Math.floor( col / 3 );
            secIndex = ( row % 3 ) * 3 + ( col % 3 );

            // Cache value in matrix
            this.matrix.row[row][col] = val;
            this.matrix.col[col][row] = val;
            this.matrix.sect[sectRow][sectCol][secIndex] = val;
        },

        /**
         * Reset the board and the game parameters
         */
        resetGame: function() {
            this.resetValidationMatrices();
            for ( var row = 0; row < 9; row++ ) {
                for ( var col = 0; col < 9; col++ ) {
                    // Reset GUI inputs
                    this.$cellMatrix[row][col].val( '' );
                }
            }

            $( '.sudoku-container input' ).removeAttr( 'disabled' );
            $( '.sudoku-container' ).removeClass( 'valid-matrix' );
        },

        /**
         * Reset and rebuild the validation matrices
         */
        resetValidationMatrices: function() {
            this.matrix = { 'row': {}, 'col': {}, 'sect': {} };
            this.validation = { 'row': {}, 'col': {}, 'sect': {} };

            // Build the row/col matrix and validation arrays
            for ( var i = 0; i < 9; i++ ) {
                this.matrix.row[i] = [ '', '', '', '', '', '', '', '', '' ];
                this.matrix.col[i] = [ '', '', '', '', '', '', '', '', '' ];
                this.validation.row[i] = [];
                this.validation.col[i] = [];
            }

            // Build the section matrix and validation arrays
            for ( var row = 0; row < 3; row++ ) {
                this.matrix.sect[row] = [];
                this.validation.sect[row] = {};
                for ( var col = 0; col < 3; col++ ) {
                    this.matrix.sect[row][col] = [ '', '', '', '', '', '', '', '', '' ];
                    this.validation.sect[row][col] = [];
                }
            }
        },

        /**
         * Validate the current number that was inserted.
         *
         * @param {String} num The value that is inserted
         * @param {Number} rowID The row the number belongs to
         * @param {Number} colID The column the number belongs to
         * @param {String} oldNum The previous value
         * @returns {Boolean} Valid or invalid input
         */
        validateNumber: function( num, rowID, colID, oldNum ) {
            var isValid = true,
                // Section
                sectRow = Math.floor( rowID / 3 ),
                sectCol = Math.floor( colID / 3 );

            // This is given as the matrix component (old value in
            // case of change to the input) in the case of on-insert
            // validation. However, in the solver, validating the
            // old number is unnecessary.
            oldNum = oldNum || '';

            // Remove oldNum from the validation matrices,
            // if it exists in them.
            if ( this.validation.row[rowID].indexOf( oldNum ) > -1 ) {
                this.validation.row[rowID].splice(
                    this.validation.row[rowID].indexOf( oldNum ), 1
                );
            }
            if ( this.validation.col[colID].indexOf( oldNum ) > -1 ) {
                this.validation.col[colID].splice(
                    this.validation.col[colID].indexOf( oldNum ), 1
                );
            }
            if ( this.validation.sect[sectRow][sectCol].indexOf( oldNum ) > -1 ) {
                this.validation.sect[sectRow][sectCol].splice(
                    this.validation.sect[sectRow][sectCol].indexOf( oldNum ), 1
                );
            }
            // Skip if empty value

            if ( num !== '' ) {


                // Validate value
                if (
                    // Make sure value is numeric
                    $.isNumeric( num ) &&
                    // Make sure value is within range
                    Number( num ) > 0 &&
                    Number( num ) <= 9
                ) {
                    // Check if it already exists in validation array
                    if (
                        $.inArray( num, this.validation.row[rowID] ) > -1 ||
                        $.inArray( num, this.validation.col[colID] ) > -1 ||
                        $.inArray( num, this.validation.sect[sectRow][sectCol] ) > -1
                    ) {
                        isValid = false;
                    } else {
                        isValid = true;
                    }
                }

                // Insert new value into validation array even if it isn't
                // valid. This is on purpose: If there are two numbers in the
                // same row/col/section and one is replaced, the other still
                // exists and should be reflected in the validation.
                // The validation will keep records of duplicates so it can
                // remove them safely when validating later changes.
                this.validation.row[rowID].push( num );
                this.validation.col[colID].push( num );
                this.validation.sect[sectRow][sectCol].push( num );
            }

            return isValid;
        },

        /**
         * Validate the entire matrix
         * @returns {Boolean} Valid or invalid matrix
         */
        validateMatrix: function() {
            var isValid, val, $element,
                hasError = false;

            // Go over entire board, and compare to the cached
            // validation arrays
            for ( var row = 0; row < 9; row++ ) {
                for ( var col = 0; col < 9; col++ ) {
                    val = this.matrix.row[row][col];
                    // Validate the value
                    isValid = this.validateNumber( val, row, col, val );
                    this.$cellMatrix[row][col].toggleClass( 'sudoku-input-error', !isValid );
                    if ( !isValid ) {
                        hasError = true;
                    }
                }
            }
            return !hasError;
        },

        /**
         * A recursive 'backtrack' solver for the
         * game. Algorithm is based on the StackOverflow answer
         * http://stackoverflow.com/questions/18168503/recursively-solving-a-sudoku-puzzle-using-backtracking-theoretically
         */
        solveGame: function( row, col ) {
            var cval, sqRow, sqCol, $nextSquare, legalValues,
                sectRow, sectCol, secIndex, gameResult;

            this.recursionCounter++;
            $nextSquare = this.findClosestEmptySquare( row, col );
            if ( !$nextSquare ) {
                // End of board
                return true;
            } else {
                sqRow = $nextSquare.data( 'row' );
                sqCol = $nextSquare.data( 'col' );
                legalValues = this.findLegalValuesForSquare( sqRow, sqCol );

                // Find the segment id
                sectRow = Math.floor( sqRow / 3 );
                sectCol = Math.floor( sqCol / 3 );
                secIndex = ( sqRow % 3 ) * 3 + ( sqCol % 3 );

                // Try out legal values for this cell
                for ( var i = 0; i < legalValues.length; i++ ) {
                    cval = legalValues[i];
                    // Update value in input
                    $nextSquare.val( cval );
                    // Update in matrices
                    this.matrix.row[sqRow][sqCol] = cval;
                    this.matrix.col[sqCol][sqRow] = cval;
                    this.matrix.sect[sectRow][sectCol][secIndex] = cval;

                    // Recursively keep trying
                    if ( this.solveGame( sqRow, sqCol ) ) {
                        return true;
                    } else {
                        // There was a problem, we should backtrack
                        this.backtrackCounter++;

                        // Remove value from input
                        this.$cellMatrix[sqRow][sqCol].val( '' );
                        // Remove value from matrices
                        this.matrix.row[sqRow][sqCol] = '';
                        this.matrix.col[sqCol][sqRow] = '';
                        this.matrix.sect[sectRow][sectCol][secIndex] = '';
                    }
                }
                // If there was no success with any of the legal
                // numbers, call backtrack recursively backwards
                return false;
            }
        },

        /**
         * Find closest empty square relative to the given cell.
         *
         * @param {Number} row Row id
         * @param {Number} col Column id
         * @returns {jQuery} Input element of the closest empty
         *  square
         */
        findClosestEmptySquare: function( row, col ) {
            var walkingRow, walkingCol, found = false;
            for ( var i = ( col + 9*row ); i < 81; i++ ) {
                walkingRow = Math.floor( i / 9 );
                walkingCol = i % 9;
                if ( this.matrix.row[walkingRow][walkingCol] === '' ) {
                    found = true;
                    return this.$cellMatrix[walkingRow][walkingCol];
                }
            }
        },

        /**
         * Find the available legal numbers for the square in the
         * given row and column.
         *
         * @param {Number} row Row id
         * @param {Number} col Column id
         * @returns {Array} An array of available numbers
         */
        findLegalValuesForSquare: function( row, col ) {
            var legalVals, legalNums, val, i,
                sectRow = Math.floor( row / 3 ),
                sectCol = Math.floor( col / 3 );

            legalNums = [ 1, 2, 3, 4, 5, 6, 7, 8, 9];

            // Check existing numbers in col
            for ( i = 0; i < 9; i++ ) {
                val = Number( this.matrix.col[col][i] );
                if ( val > 0 ) {
                    // Remove from array
                    if ( legalNums.indexOf( val ) > -1 ) {
                        legalNums.splice( legalNums.indexOf( val ), 1 );
                    }
                }
            }

            // Check existing numbers in row
            for ( i = 0; i < 9; i++ ) {
                val = Number( this.matrix.row[row][i] );
                if ( val > 0 ) {
                    // Remove from array
                    if ( legalNums.indexOf( val ) > -1 ) {
                        legalNums.splice( legalNums.indexOf( val ), 1 );
                    }
                }
            }

            // Check existing numbers in section
            sectRow = Math.floor( row / 3 );
            sectCol = Math.floor( col / 3 );
            for ( i = 0; i < 9; i++ ) {
                val = Number( this.matrix.sect[sectRow][sectCol][i] );
                if ( val > 0 ) {
                    // Remove from array
                    if ( legalNums.indexOf( val ) > -1 ) {
                        legalNums.splice( legalNums.indexOf( val ), 1 );
                    }
                }
            }

            if ( this.config.solver_shuffle_numbers ) {
                // Shuffling the resulting 'legalNums' array will
                // make sure the solver produces different answers
                // for the same scenario. Otherwise, 'legalNums'
                // will be chosen in sequence.
                for ( i = legalNums.length - 1; i > 0; i-- ) {
                    var rand = getRandomInt( 0, i );
                    temp = legalNums[i];
                    legalNums[i] = legalNums[rand];
                    legalNums[rand] = temp;
                }
            }

            return legalNums;
        },
    };

    /**
     * Get a random integer within a range
     *
     * @param {Number} min Minimum number
     * @param {Number} max Maximum range
     * @returns {Number} Random number within the range (Inclusive)
     */
    function getRandomInt(min, max) {
        return Math.floor( Math.random() * ( max + 1 ) ) + min;
    }

    return {
        /**
         * Get the singleton instance. Only one instance is allowed.
         * The method will either create an instance or will return
         * the already existing instance.
         *
         * @param {[type]} config [description]
         * @returns {[type]} [description]
         */
        getInstance: function( config ) {
            if ( !_instance ) {
                _instance = init( config );
            }
            return _instance;
        }
    };
} )( jQuery );
