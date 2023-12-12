const jwt = require('jsonwebtoken');
const Key = 'SecretKey';

// function verifyToken(req, res, next) {
//     const authHeader = req.header('Authorization');
//     if (!authHeader) {
//         return res.status(401).json({ msg: 'Unauthorized token' });
//     }
    
//     const authHeaderParts = authHeader.split(' ');
//     if (authHeaderParts.length !== 2 || authHeaderParts[0] !== 'Bearer') {
//         return res.status(401).json({ msg: 'Invalid token format' });
//     }
    
//     const token = authHeaderParts[1];

    //------------query parameter ---------------//
//     const token = req.query.token; // Assuming the token is passed as a query parameter
//     if (!token) {
//         return res.status(401).json({ msg: 'Unauthorized token' });
//     }

//     jwt.verify(token, Key, (err, decoded) => {
//        // console.log('Token:', token);
//         if (err) {
//             console.error('Token verification failed:', err);
//             return res.status(403).json({ msg: 'Token is not valid' });
//         }
//         req.user = decoded; // Store the user information
//         next(); // Continue to the protected route
//     });
// }
 

function verifyToken(req, res, next) {
    
    let token = '';
    
    // Check the header for the token
    const authHeader = req.header('Authorization');
    if (authHeader && authHeader.startsWith('Bearer ')) {
        token = authHeader.substring(7); 
    }

    
    if (!token) {
        token = req.query.token; 
    }

    
    if (!token) {
        token = req.body.token;
    }

    
    if (!token) {
        return res.status(401).json({ msg: 'Unauthorized token' });
    }

    jwt.verify(token, Key, (err, decoded) => {
        if (err) {
            console.error('Token verification failed:', err);
            return res.status(403).json({ msg: 'Token is not valid' });
        }
        // req.user = decoded; 
        req.user = {
            userId: decoded.userId, // Assuming your user model has a userId field
            name: decoded.name,
            isAdmin: decoded.isAdmin,
            email: decoded.email,
            phone: decoded.phone,
        };
        next(); 
    });
}

module.exports = verifyToken;

