/**
 * Groq AI Service. Generates SQL from natural language. Implements Layer 1 authorization by including user permissions in the prompt.
 */

const Groq = require('groq-sdk');
const env = require('../config/env');

const groq = new Groq({ apiKey: env.groq.apiKey });

/**
 * Generates SQL variants from natural language description. @returns {Promise<object>} Generated query variants or error
 */
async function generateQuery(naturalLanguage, schema, userPermissions, dialect = 'postgresql') {
  const systemPrompt = buildSystemPrompt(schema, userPermissions, dialect);
  const userPrompt = `Convert this request to SQL: "${naturalLanguage}"`;

  try {
    const completion = await groq.chat.completions.create({
      model: env.groq.model,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      temperature: 0.1,
      max_tokens: 2048,
      response_format: { type: 'json_object' },
    });

    const rawContent = completion.choices?.[0]?.message?.content;

    if (!rawContent) {
      return { error: 'AI did not return a response. Please try again.' };
    }

    return safeParseJSON(rawContent);
  } catch (err) {
    console.error('Groq API error:', err.message);

    if (err.status === 429) {
      return { error: 'AI service rate limit reached. Please wait a moment and try again.' };
    }

    if (err.status === 503 || err.status === 500) {
      return { error: 'AI service is temporarily unavailable. Please try again later.' };
    }

    return { error: 'Failed to generate SQL query. Please try again.' };
  }
}

/**
 * Analyzes and optimizes an existing SQL query. @returns {Promise<object>} Analysis results
 */
async function analyzeQuery(sqlQuery, schema, dialect = 'postgresql') {
  const systemPrompt = `You are a PostgreSQL query optimization expert.
You are given a database schema and a SQL query. Analyze the query and provide optimization suggestions.

DATABASE SCHEMA:
${schema}

DIALECT: ${dialect}

RESPONSE FORMAT: You MUST return ONLY valid JSON, no markdown, no code fences, no preamble.
Return a JSON object with this exact structure:
{
  "originalQuery": "the original query",
  "optimizedQuery": "the optimized version of the query",
  "explanation": "detailed explanation of what was changed and why",
  "suggestions": ["list of specific optimization suggestions"],
  "performanceImpact": "estimated performance impact description",
  "indexSuggestions": ["suggested indexes that could help"]
}`;

  try {
    const completion = await groq.chat.completions.create({
      model: env.groq.model,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: `Analyze and optimize this SQL query:\n${sqlQuery}` },
      ],
      temperature: 0.1,
      max_tokens: 2048,
      response_format: { type: 'json_object' },
    });

    const rawContent = completion.choices?.[0]?.message?.content;

    if (!rawContent) {
      return { error: 'AI did not return a response. Please try again.' };
    }

    return safeParseJSON(rawContent);
  } catch (err) {
    console.error('Groq API error (analyze):', err.message);
    return { error: 'Failed to analyze query. Please try again.' };
  }
}

/**
 * Builds the system prompt with schema, permissions, and authorization rules.
 */
function buildSystemPrompt(schema, userPermissions, dialect) {
  return `You are an expert SQL optimization assistant. You have access to this database schema (DDL only — never row data).

Dialect: ${dialect}

SCHEMA:
${schema}

User permissions:
- Allowed Tables: ${userPermissions.allowedTables.join(', ')}

CRITICAL: Return ONLY a valid JSON object. No markdown. No backticks. No text before or after the JSON.

Generate the query based on the user's natural language request. If the query requires filtering or joining tables, use the allowed tables.

For all valid requests return exactly this structure:
{
  "variants": [
    {
      "query": "SELECT id, first_name FROM employees LIMIT 10",
      "explanation": "Selects specific columns instead of all columns",
      "clauses": ["SELECT specifies exact columns needed", "LIMIT prevents returning unbounded rows"]
    },
    {
      "query": "SELECT id, first_name, last_name FROM employees WHERE is_active = true LIMIT 10",
      "explanation": "Adds filter to reduce result set",
      "clauses": ["WHERE filters to active employees only", "LIMIT caps at 10 rows"]
    }
  ],
  "recommended": 0,
  "issues": ["SELECT * retrieves all columns — use specific column names for better performance", "No LIMIT clause — could return all rows in large tables"],
  "estimatedRows": "25 rows estimated based on table structure",
  "optimizedQuery": "SELECT id, first_name, last_name FROM employees LIMIT 10",
  "explanation": "The original query fetches all columns which is inefficient. The optimized version selects only needed columns and adds a LIMIT clause.",
  "dialect": "${dialect}",
  "impactWarning": null
}`;
}

/**
 * Safely parses JSON from Groq response, stripping markdown fences if present.
 */
function safeParseJSON(rawContent) {
  const clean = rawContent
    .replace(/^```json\s*/i, '')
    .replace(/^```\s*/i, '')
    .replace(/\s*```$/i, '')
    .trim()

  let parsed
  try {
    parsed = JSON.parse(clean)
  } catch (e) {
    console.error('Groq JSON parse failed:', clean.slice(0, 300))
    parsed = {
      variants: [],
      issues: [],
      estimatedRows: 'Unknown',
      optimizedQuery: '',
      explanation: clean, // show raw text as explanation fallback
      dialect: 'postgresql',
      error: null
    }
  }

  return parsed
}

module.exports = { generateQuery, analyzeQuery };
