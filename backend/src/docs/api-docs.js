/**
 * @swagger
 * /api/auth/login:
 *   post:
 *     summary: Login user
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email, password]
 *             properties:
 *               email:
 *                 type: string
 *               password:
 *                 type: string
 *     responses:
 *       200:
 *         description: Login successful
 * 
 * /api/catches:
 *   get:
 *     summary: Get all catches
 *     tags: [Catches]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of sensors
 * 
 * /api/catches/simulate:
 *   post:
 *     summary: Simulate MQTT data
 *     tags: [Catches]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               imei:
 *                 type: string
 *               status:
 *                 type: string
 *     responses:
 *       200:
 *         description: Simulation sent
 */
