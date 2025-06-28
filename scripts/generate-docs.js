#!/usr/bin/env node

/**
 * API Documentation Generator Script
 * Generates OpenAPI/Swagger documentation for the Friendlines API
 */

const swaggerJsdoc = require('swagger-jsdoc');
const fs = require('fs');
const path = require('path');

// Import swagger configuration
const swaggerOptions = require('../swaggerDef');

async function generateDocs() {
  try {
    console.log('🚀 Generating API documentation...');
    
    // Generate OpenAPI specification
    const specs = swaggerJsdoc(swaggerOptions);
    
    // Create docs directory if it doesn't exist
    const docsDir = path.join(__dirname, '../docs');
    if (!fs.existsSync(docsDir)) {
      fs.mkdirSync(docsDir, { recursive: true });
    }
    
    // Write swagger.json
    const swaggerPath = path.join(docsDir, 'swagger.json');
    fs.writeFileSync(swaggerPath, JSON.stringify(specs, null, 2));
    
    // Write swagger.yaml (optional)
    const yaml = require('js-yaml');
    const yamlPath = path.join(docsDir, 'swagger.yaml');
    fs.writeFileSync(yamlPath, yaml.dump(specs));
    
    console.log('✅ Documentation generated successfully!');
    console.log(`📄 JSON: ${swaggerPath}`);
    console.log(`📄 YAML: ${yamlPath}`);
    console.log('🌐 Start server and visit /api-docs to view interactive documentation');
    
    // Validate the specification
    validateSpec(specs);
    
  } catch (error) {
    console.error('❌ Error generating documentation:', error.message);
    process.exit(1);
  }
}

function validateSpec(specs) {
  console.log('\n🔍 Validating API specification...');
  
  let warnings = 0;
  let errors = 0;
  
  // Check if we have any paths
  if (!specs.paths || Object.keys(specs.paths).length === 0) {
    console.warn('⚠️  No API paths found. Make sure your routes have @swagger comments.');
    warnings++;
  } else {
    console.log(`✅ Found ${Object.keys(specs.paths).length} API endpoints`);
  }
  
  // Check if we have components/schemas
  if (!specs.components || !specs.components.schemas || Object.keys(specs.components.schemas).length === 0) {
    console.warn('⚠️  No schemas found. Consider adding more detailed schemas in swaggerDef.js');
    warnings++;
  } else {
    console.log(`✅ Found ${Object.keys(specs.components.schemas).length} schemas`);
  }
  
  // Check for basic required fields
  if (!specs.info || !specs.info.title || !specs.info.version) {
    console.error('❌ Missing required info fields (title, version)');
    errors++;
  }
  
  // Summary
  console.log(`\n📊 Validation Summary:`);
  console.log(`   Endpoints: ${specs.paths ? Object.keys(specs.paths).length : 0}`);
  console.log(`   Schemas: ${specs.components?.schemas ? Object.keys(specs.components.schemas).length : 0}`);
  console.log(`   Warnings: ${warnings}`);
  console.log(`   Errors: ${errors}`);
  
  if (errors > 0) {
    console.error('\n❌ Validation failed with errors');
    process.exit(1);
  } else if (warnings > 0) {
    console.warn('\n⚠️  Validation completed with warnings');
  } else {
    console.log('\n✅ Validation passed!');
  }
}

// Run if called directly
if (require.main === module) {
  generateDocs();
}

module.exports = { generateDocs }; 