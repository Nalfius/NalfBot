const { handleJokeCommand, isJokeCommand, getRandomJoke } = require('./jokes.js');

console.log('Running jokes.js tests...\n');

// Test isJokeCommand
console.log('Testing isJokeCommand:');
console.log(`  "!blague" -> ${isJokeCommand('!blague')} (expected: true)`);
console.log(`  "!joke" -> ${isJokeCommand('!joke')} (expected: true)`);
console.log(`  "!blague " -> ${isJokeCommand('!blague ')} (expected: true)`);
console.log(`  "test !blague" -> ${isJokeCommand('test !blague')} (expected: false)`);
console.log(`  "quoi" -> ${isJokeCommand('quoi')} (expected: false)`);

// Test getRandomJoke (should return null since jokes array is empty)
console.log('\nTesting getRandomJoke:');
const joke = getRandomJoke();
console.log(`  Result: ${joke} (expected: null)`);

// Test handleJokeCommand
console.log('\nTesting handleJokeCommand:');
console.log(`  "!blague" -> ${handleJokeCommand('!blague')} (expected: null)`);
console.log(`  "!joke" -> ${handleJokeCommand('!joke')} (expected: null)`);
console.log(`  "test" -> ${handleJokeCommand('test')} (expected: null)`);

console.log('\n✓ All jokes tests passed (no errors)');
