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
  
  try {
    const result = await supabaseService.addDocument(testDocument);
    return result;
  } catch (error) {
    
    return { success: false, error: error.message };
  }
}

// Function to search for documents
async function searchDocuments(query = 'test') {
  
  try {
    const results = await supabaseService.searchDocuments(query);
    return results;
  } catch (error) {
    
    return [];
  }
}

// Run the tests
async function runTests() {
  
  // Test adding a document
  const addResult = await addTestDocument();
  
  // Test searching for documents
  const searchResults = await searchDocuments();
  
  return {
    addResult,
    searchResults
  };
}

// Execute tests


export default runTests; 