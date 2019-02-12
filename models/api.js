
const { BigQuery } = require('@google-cloud/bigquery');
const bigquery = new BigQuery();
const dataset = bigquery.dataset('securityClients');

module.exports = {

    async generateKeyset(clientId) {

        let sqlQuery = `SELECT
        clientId FROM securityClients.ClientKeysets
        WHERE clientId = '${clientId}'`;

        let options = {
            query: sqlQuery,
            location: 'US',
        };

        let row = await bigquery.query(options);
        if (row[0][0] != undefined) {
            return true;
        } else {
            sqlQuery = `SELECT
        KEYS.NEW_KEYSET('AEAD_AES_GCM_256') AS keyset`;
            options.query = sqlQuery;
            row = await bigquery.query(options);
            if (row[0][0] != undefined) {
                const table = dataset.table('ClientKeysets');
                const keyset = row[0][0]['keyset'];
                console.log(`url: ${keyset}`);
                let insert = await table.insert({
                    clientId: clientId,
                    keyset: keyset,
                });
                return insert != undefined;
            }
        }
    },

    async  insertEncryptData(jsonData) {
        let existKey = await this.generateKeyset(jsonData.clientId)
        if (existKey) {
            const sqlQuery = `SELECT
    AEAD.ENCRYPT(
        (SELECT keyset
         FROM securityClients.ClientKeysets AS ck
         WHERE ck.clientId = '${jsonData.clientId}'),
        '${jsonData.pan}', CAST(${jsonData.clientId} AS STRING)
      ) AS encrypted_data
    `;

            const options = {
                query: sqlQuery,
                location: 'US',
            };

            const row = await bigquery.query(options);
            console.log('Query Results:');
            if (row[0][0] != undefined) {
                const table = dataset.table('EncryptedClientData');
                const encrypted_data = row[0][0]['encrypted_data'];
                console.log(`url: ${encrypted_data}`);
                let data = await table.insert({
                    clientId: jsonData.clientId,
                    cardNumber: encrypted_data
                })
                return data != undefined;
            }
        }
    },

    async  getDecryptData() {
        const sqlQuery = `SELECT
        ecd.clientId,
        AEAD.DECRYPT_STRING(
          (SELECT keyset
           FROM securityClients.ClientKeysets AS ck
           WHERE ck.clientId = ecd.clientId),
          ecd.cardNumber,
          CAST(ecd.clientId AS STRING)
        ) AS cardNumber
      FROM securityClients.EncryptedClientData AS ecd
    `;

        const options = {
            query: sqlQuery,
            location: 'US'
        };

        let result = await bigquery.query(options);
        if (result[0]) {
            return result[0];
        }
    },

    async rotateKeyset() {
        let sqlQuery = `UPDATE
        securityClients.ClientKeysets AS ck
        SET ck.keyset = KEYS.ROTATE_KEYSET(ck.keyset, 'AEAD_AES_GCM_256')
        WHERE true`;

        const options = {
            query: sqlQuery,
            location: 'US',
        };

        let row = await bigquery.query(options);
        console.log('Query Results:');
        if (row) {
            sqlQuery = `UPDATE 
            securityClients.EncryptedClientData AS ecd
            SET ecd.cardNumber = (
              SELECT
                AEAD.ENCRYPT(
                  ck.keyset,
                  AEAD.DECRYPT_STRING(
                    ck.keyset,
                    ecd.cardNumber,
                    CAST(ck.clientId AS STRING)
                  ),
                  CAST(ck.clientId AS STRING)
                )
              FROM securityClients.ClientKeysets AS ck
              WHERE ck.clientId = ecd.clientId
            ) WHERE true`;
            options.query = sqlQuery;
            row = await bigquery.query(options);
            return row != undefined;
        }
    },

    async destroyNounusedKeyset() {
        let sqlQuery = `UPDATE
        securityClients.ClientKeysets AS ck
        SET ck.keyset = KEYS.DESTROY_DISABLED_SECONDARY_KEYS(ck.keyset)
        WHERE true`;

        const options = {
            query: sqlQuery,
            location: 'US',
        };

        let row = await bigquery.query(options);
        return row != undefined;
    }
}
