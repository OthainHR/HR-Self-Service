// Test script for direct Supabase connection from frontend
import supabaseService from './services/supabase';

// Simple test document
const testDocument = {
  text: "This is a test document created from the frontend test script",
  title: "Frontend Test Document",
  source: "Test Script",
  category: "test"
};

// Function to add a test document
async function addTestDocument() {
  console.log('Attempting to add test document via supabaseService...');
  
  try {
    const result = await supabaseService.addDocument(testDocument);
    console.log('Add document result:', result);
    return result;
  } catch (error) {
    console.error('Error adding document:', error);
    return { success: false, error: error.message };
  }
}

// Function to search for documents
async function searchDocuments(query = 'test') {
  console.log(`Searching for documents with query: "${query}"...`);
  
  try {
    const results = await supabaseService.searchDocuments(query);
    console.log('Search results:', results);
    return results;
  } catch (error) {
    console.error('Error searching documents:', error);
    return [];
  }
}

// Run the tests
async function runTests() {
  console.log('=== SUPABASE DIRECT CONNECTION TEST ===');
  
  // Test adding a document
  console.log('\n1. TESTING DOCUMENT ADDITION:');
  const addResult = await addTestDocument();
  
  // Test searching for documents
  console.log('\n2. TESTING DOCUMENT SEARCH:');
  const searchResults = await searchDocuments();
  
  console.log('\nTEST SUMMARY:');
  console.log('Add document result:', addResult.success ? 'SUCCESS' : 'FAILED');
  console.log('Search results:', searchResults.length > 0 ? `Found ${searchResults.length} documents` : 'No documents found');
  
  return {
    addResult,
    searchResults
  };
}

// Execute tests
runTests()
  .then(results => console.log('Tests completed successfully'))
  .catch(error => console.error('Test execution failed:', error));

export default runTests; 