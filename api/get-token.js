/**
 * Vercel Serverless Function
 * Returns the Mapbox token from environment variables
 * This ensures the token is never committed to Git
 */

export default async function handler(req, res) {
    // Enable CORS
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET');
    
    // Return the token from environment variable
    const token = process.env.MAPBOX_TOKEN;
    
    if (!token) {
        return res.status(500).json({ error: 'Token not configured' });
    }
    
    return res.status(200).json({ token });
}
