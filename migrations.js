app.post('/migrateSuppliers', async function (req, res) {
    try {
        // Get Firestore documents
        const snapshot = await admin.firestore().collection('suppliers').get();
        console.log(`Found ${snapshot.docs.length} documents to process`);
        
        let successCount = 0;
        let skipCount = 0;
        let errorCount = 0;
        
        // Process documents in smaller batches to avoid overwhelming the connection
        const batchSize = 50;
        for (let i = 0; i < snapshot.docs.length; i += batchSize) {
            const batch = snapshot.docs.slice(i, i + batchSize);
            console.log(`Processing batch ${Math.floor(i/batchSize) + 1}/${Math.ceil(snapshot.docs.length/batchSize)}`);
            
            // Process each document in the current batch
            const batchPromises = batch.map(async (doc) => {
                try {
                    const data = doc.data();
                    var mongoDoc = {
                        'note': data['note'],
                        'notes': data['notes'],
                        'attachments': data['attachments'],
                        'instaHandle': data['instaHandle'],
                        'hq': data['hq'],
                        'commission_B':data['commission_B'],
                        'number': data['number'],
                        'exactDate': data['exactDate'].toDate(),
                        'name': data['name'],
                        'defaultCommission': data['defaultCommission'],
                        'payedByFToS': data['payedByFToS'],
                        'commission_S': data['commission_S'],
                        '_id': data['id'],
                        'category': data['category'],
                        'email': data['email'],
                    }

                    // Check if document already exists in MongoDB
                    const exists = await db.collection('suppliers').findOne(
                        { _id: mongoDoc._id }, 
                        { projection: { _id: 1 } }
                    );
                    
                    if (!exists) {
                        // Document doesn't exist, insert it
                        await db.collection('suppliers').insertOne(mongoDoc);
                        successCount++;
                        return { status: 'success', id: mongoDoc._id };
                    } else {
                        // Document already exists, skip it
                        skipCount++;
                        return { status: 'skipped', id: mongoDoc._id };
                    }
                } catch (error) {
                    errorCount++;
                    console.error(`Error processing document: ${error.message}`);
                    return { status: 'error', error: error.message };
                }
            });
            
            // Wait for the current batch to complete
            await Promise.all(batchPromises);
            
            // Add a small delay between batches to avoid overwhelming the connection
            if (i + batchSize < snapshot.docs.length) {
                await new Promise(resolve => setTimeout(resolve, 1000));
            }
        }
        
        res.status(200).json({
            message: 'Migration completed',
            total: snapshot.docs.length,
            inserted: successCount,
            skipped: skipCount,
            failed: errorCount
        });
    } catch (error) {
        console.error('Migration failed:', error);
        res.status(400).json({
            message: 'Migration failed',
            error: error.message
        });
    }
});

function convertFirestoreToMongo(firestoreDoc) {
    // Create a new object with the same structure
    const mongoDoc = { ...firestoreDoc };
    
    // Convert the Firestore ID to MongoDB _id
    mongoDoc._id = mongoDoc.id;
    delete mongoDoc.id;  // Remove the old id field
    
    // Convert top-level timestamp fields to Date objects
    if (mongoDoc.exactDate && mongoDoc.exactDate.seconds) {
      mongoDoc.exactDate = new Date(mongoDoc.exactDate.seconds * 1000 + mongoDoc.exactDate.nanoseconds / 1000000);
    }
    
    if (mongoDoc.request_Date && mongoDoc.request_Date.seconds) {
      mongoDoc.request_Date = new Date(mongoDoc.request_Date.seconds * 1000 + mongoDoc.request_Date.nanoseconds / 1000000);
    }
    
    // Convert timestamps in nested notes array
    if (mongoDoc.notes && Array.isArray(mongoDoc.notes)) {
      mongoDoc.notes = mongoDoc.notes.map(note => {
        const newNote = { ...note };
        
        // Convert date field if it exists and is a Timestamp
        if (newNote.date && newNote.date.seconds) {
          newNote.date = new Date(newNote.date.seconds * 1000 + newNote.date.nanoseconds / 1000000);
        }
        
        // Convert realDate field if it exists and is a Timestamp
        if (newNote.realDate && newNote.realDate.seconds) {
          newNote.realDate = new Date(newNote.realDate.seconds * 1000 + newNote.realDate.nanoseconds / 1000000);
        }
        
        return newNote;
      });
    }
    
    return mongoDoc;
  }

  app.post('/migrateClients', async function (req, res) {
    try {
        // Get Firestore documents
        const snapshot = await admin.firestore().collection('clients').get();
        console.log(`Found ${snapshot.docs.length} documents to process`);
        
        let successCount = 0;
        let skipCount = 0;
        let errorCount = 0;
        
        // Process documents in smaller batches to avoid overwhelming the connection
        const batchSize = 50;
        for (let i = 0; i < snapshot.docs.length; i += batchSize) {
            const batch = snapshot.docs.slice(i, i + batchSize);
            console.log(`Processing batch ${Math.floor(i/batchSize) + 1}/${Math.ceil(snapshot.docs.length/batchSize)}`);
            
            // Process each document in the current batch
            const batchPromises = batch.map(async (doc) => {
                try {
                    const data = doc.data();
                    const mongoDoc = convertFirestoreToMongo(data);
                    
                    // Check if document already exists in MongoDB
                    const exists = await db.collection('clients').findOne(
                        { _id: mongoDoc._id }, 
                        { projection: { _id: 1 } }
                    );
                    
                    if (!exists) {
                        // Document doesn't exist, insert it
                        await db.collection('clients').insertOne(mongoDoc);
                        successCount++;
                        return { status: 'success', id: mongoDoc._id };
                    } else {
                        // Document already exists, skip it
                        skipCount++;
                        return { status: 'skipped', id: mongoDoc._id };
                    }
                } catch (error) {
                    errorCount++;
                    console.error(`Error processing document: ${error.message}`);
                    return { status: 'error', error: error.message };
                }
            });
            
            // Wait for the current batch to complete
            await Promise.all(batchPromises);
            
            // Add a small delay between batches to avoid overwhelming the connection
            if (i + batchSize < snapshot.docs.length) {
                await new Promise(resolve => setTimeout(resolve, 1000));
            }
        }
        
        res.status(200).json({
            message: 'Migration completed',
            total: snapshot.docs.length,
            inserted: successCount,
            skipped: skipCount,
            failed: errorCount
        });
    } catch (error) {
        console.error('Migration failed:', error);
        res.status(400).json({
            message: 'Migration failed',
            error: error.message
        });
    }
});

app.post('/migrateEvents', async function (req, res) {
    try {
        // Get Firestore documents
        const snapshot = await admin.firestore().collection('events').get();
        console.log(`Found ${snapshot.docs.length} documents to process`);
        
        let successCount = 0;
        let skipCount = 0;
        let errorCount = 0;
        
        // Process documents in smaller batches to avoid overwhelming the connection
        const batchSize = 50;

        for (let i = 0; i < snapshot.docs.length; i += batchSize) {
            const batch = snapshot.docs.slice(i, i + batchSize);
            console.log(`Processing batch ${Math.floor(i/batchSize) + 1}/${Math.ceil(snapshot.docs.length/batchSize)}`);
            
            // Process each document in the current batch
            const batchPromises = batch.map(async (doc) => {
                try {
                    const data = doc.data();
                    const mongoDoc = convertEventFirestoreToMongo(data);
                    
                    // Check if document already exists in MongoDB
                    const exists = await db.collection('events').findOne(
                        { _id: mongoDoc._id }, 
                        { projection: { _id: 1 } }
                    );
                    
                    if (!exists) {
                        // Document doesn't exist, insert it
                        await db.collection('events').insertOne(mongoDoc);
                        successCount++;
                        return { status: 'success', id: mongoDoc._id };
                    } else {
                        // Document already exists, skip it
                        skipCount++;
                        return { status: 'skipped', id: mongoDoc._id };
                    }
                } catch (error) {
                    errorCount++;
                    console.error(`Error processing document: ${error.message}`);
                    return { status: 'error', error: error.message };
                }
            });
            
            // Wait for the current batch to complete
            await Promise.all(batchPromises);
            
            // Add a small delay between batches to avoid overwhelming the connection
            if (i + batchSize < snapshot.docs.length) {
                await new Promise(resolve => setTimeout(resolve, 1000));
            }
        }
        
        res.status(200).json({
            message: 'Migration completed',
            total: snapshot.docs.length,
            inserted: successCount,
            skipped: skipCount,
            failed: errorCount
        });
    } catch (error) {
        console.error('Migration failed:', error);
        res.status(400).json({
            message: 'Migration failed',
            error: error.message
        });
    }
});

function convertEventFirestoreToMongo(firestoreDoc) {
    // Create a deep copy to avoid modifying the original
    const mongoDoc = JSON.parse(JSON.stringify(firestoreDoc));
    
    // Handle document _id
    if (mongoDoc.id) {
      mongoDoc._id = mongoDoc.id;
      // Keep the original id for reference if needed
    }
    
    // Convert top-level timestamps
    const topLevelTimestampFields = ['event_Date', 'request_Date', 'exactDate'];
    topLevelTimestampFields.forEach(field => {
      if (mongoDoc[field] && mongoDoc[field]._seconds !== undefined) {
        mongoDoc[field] = new Date(mongoDoc[field]._seconds * 1000);
      }
    });
    
    // Handle reminders array with nested timestamps
    if (Array.isArray(mongoDoc.reminders)) {
      mongoDoc.reminders = mongoDoc.reminders.map(reminder => {
        // Convert date and realDate fields if they exist and are timestamps
        if (reminder.date && reminder.date._seconds !== undefined) {
          reminder.date = new Date(reminder.date._seconds * 1000);
        }
        if (reminder.realDate && reminder.realDate._seconds !== undefined) {
          reminder.realDate = new Date(reminder.realDate._seconds * 1000);
        }
        return reminder;
      });
    }
    
    // Handle payments array with nested timestamps
    if (Array.isArray(mongoDoc.payments)) {
      mongoDoc.payments = mongoDoc.payments.map(payment => {
        if (payment.date && payment.date._seconds !== undefined) {
          payment.date = new Date(payment.date._seconds * 1000);
        }
        if (payment.realDate && payment.realDate._seconds !== undefined) {
          payment.realDate = new Date(payment.realDate._seconds * 1000);
        }
        return payment;
      });
    }
    
    // Handle notes array with nested timestamps
    if (Array.isArray(mongoDoc.notes)) {
      mongoDoc.notes = mongoDoc.notes.map(note => {
        if (note.date && note.date._seconds !== undefined) {
          note.date = new Date(note.date._seconds * 1000);
        }
        if (note.realDate && note.realDate._seconds !== undefined) {
          note.realDate = new Date(note.realDate._seconds * 1000);
        }
        return note;
      });
    }
    
    // Handle suppliers array with nested timestamps and arrays
    if (Array.isArray(mongoDoc.suppliers)) {
      mongoDoc.suppliers = mongoDoc.suppliers.map(supplier => {
        if (supplier.realDate && supplier.realDate._seconds !== undefined) {
          supplier.realDate = new Date(supplier.realDate._seconds * 1000);
        }
        
        // Handle nested payments array within each supplier
        if (Array.isArray(supplier.payments)) {
          supplier.payments = supplier.payments.map(payment => {
            if (payment.date && payment.date._seconds !== undefined) {
              payment.date = new Date(payment.date._seconds * 1000);
            }
            if (payment.realDate && payment.realDate._seconds !== undefined) {
              payment.realDate = new Date(payment.realDate._seconds * 1000);
            }
            return payment;
          });
        }
        
        return supplier;
      });
    }
    
    return mongoDoc;
  }

  app.post('/migrateLogs', async function (req, res) {
    try {
        // Get Firestore documents
        const snapshot = await admin.firestore().collection('logs').get();
        console.log(`Found ${snapshot.docs.length} documents to process`);
        
        let successCount = 0;
        let skipCount = 0;
        let errorCount = 0;
        
        // Process documents in smaller batches to avoid overwhelming the connection
        const batchSize = 50;
        for (let i = 0; i < snapshot.docs.length; i += batchSize) {
            const batch = snapshot.docs.slice(i, i + batchSize);
            console.log(`Processing batch ${Math.floor(i/batchSize) + 1}/${Math.ceil(snapshot.docs.length/batchSize)}`);
            
            // Process each document in the current batch
            const batchPromises = batch.map(async (doc) => {
                try {
                    const data = doc.data();
                    var mongoDoc = {
                        'log': data['log'],
                        'exactDate': data['exactDate'].toDate(),
                        '_id': data['id'],
                        'email': data['email'],
                    }

                    // Check if document already exists in MongoDB
                    const exists = await db.collection('logs').findOne(
                        { _id: mongoDoc._id }, 
                        { projection: { _id: 1 } }
                    );
                    
                    if (!exists) {
                        // Document doesn't exist, insert it
                        await db.collection('logs').insertOne(mongoDoc);
                        successCount++;
                        return { status: 'success', id: mongoDoc._id };
                    } else {
                        // Document already exists, skip it
                        skipCount++;
                        return { status: 'skipped', id: mongoDoc._id };
                    }
                } catch (error) {
                    errorCount++;
                    console.error(`Error processing document: ${error.message}`);
                    return { status: 'error', error: error.message };
                }
            });
            
            // Wait for the current batch to complete
            await Promise.all(batchPromises);
            
            // Add a small delay between batches to avoid overwhelming the connection
            if (i + batchSize < snapshot.docs.length) {
                await new Promise(resolve => setTimeout(resolve, 1000));
            }
        }
        
        res.status(200).json({
            message: 'Migration completed',
            total: snapshot.docs.length,
            inserted: successCount,
            skipped: skipCount,
            failed: errorCount
        });
    } catch (error) {
        console.error('Migration failed:', error);
        res.status(400).json({
            message: 'Migration failed',
            error: error.message
        });
    }
});