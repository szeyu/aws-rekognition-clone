import { Request, Response } from "express";
import { client } from "../db";
import { s3Service } from "../services/s3Service";
import { sendErrorResponse } from "../utils/responseHelpers";

/**
 * GET /management/faces
 * List all detected faces with pagination
 */
export const listDetectedFaces = async (req: Request, res: Response): Promise<void> => {
  try {
    const limit = parseInt(req.query.limit as string) || 50;
    const offset = parseInt(req.query.offset as string) || 0;

    const result = await client.query(
      `SELECT
        id,
        identifier,
        bounding_box,
        confidence,
        created_at,
        original_image_path,
        face_image_path
       FROM detected_faces
       ORDER BY created_at DESC
       LIMIT $1 OFFSET $2`,
      [limit, offset]
    );

    const countResult = await client.query(
      "SELECT COUNT(*) as total FROM detected_faces"
    );

    res.json({
      total: parseInt(countResult.rows[0].total),
      limit,
      offset,
      faces: result.rows.map(row => ({
        face_id: row.id,
        identifier: row.identifier,
        bounding_box: row.bounding_box,
        confidence: row.confidence,
        created_at: row.created_at,
        s3_keys: {
          original: row.original_image_path,
          face: row.face_image_path,
        },
      })),
    });
  } catch (error: unknown) {
    console.error("Error in listDetectedFaces:", error);
    sendErrorResponse(res, error);
  }
};

/**
 * GET /management/customers
 * List all enrolled customers with pagination
 */
export const listEnrolledCustomers = async (req: Request, res: Response): Promise<void> => {
  try {
    const limit = parseInt(req.query.limit as string) || 50;
    const offset = parseInt(req.query.offset as string) || 0;

    const result = await client.query(
      `SELECT
        ec.id,
        ec.face_id,
        ec.customer_identifier,
        ec.customer_name,
        ec.customer_metadata,
        ec.created_at,
        df.identifier as face_identifier,
        df.face_image_path
       FROM enrolled_customers ec
       LEFT JOIN detected_faces df ON ec.face_id = df.id
       ORDER BY ec.created_at DESC
       LIMIT $1 OFFSET $2`,
      [limit, offset]
    );

    const countResult = await client.query(
      "SELECT COUNT(*) as total FROM enrolled_customers"
    );

    res.json({
      total: parseInt(countResult.rows[0].total),
      limit,
      offset,
      customers: result.rows.map(row => ({
        customer_id: row.id,
        face_id: row.face_id,
        customer_identifier: row.customer_identifier,
        customer_name: row.customer_name,
        customer_metadata: row.customer_metadata,
        face_identifier: row.face_identifier,
        created_at: row.created_at,
        face_image_s3_key: row.face_image_path,
      })),
    });
  } catch (error: unknown) {
    console.error("Error in listEnrolledCustomers:", error);
    sendErrorResponse(res, error);
  }
};

/**
 * GET /management/customers/:customer_id
 * Get specific customer details
 */
export const getCustomerDetails = async (req: Request, res: Response): Promise<void> => {
  try {
    const { customer_id } = req.params;

    const result = await client.query(
      `SELECT
        ec.id,
        ec.face_id,
        ec.customer_identifier,
        ec.customer_name,
        ec.customer_metadata,
        ec.created_at,
        df.identifier as face_identifier,
        df.bounding_box,
        df.confidence,
        df.original_image_path,
        df.face_image_path
       FROM enrolled_customers ec
       LEFT JOIN detected_faces df ON ec.face_id = df.id
       WHERE ec.id = $1`,
      [customer_id]
    );

    if (result.rows.length === 0) {
      res.status(404).json({ error: "Customer not found" });
      return;
    }

    const row = result.rows[0];
    res.json({
      customer_id: row.id,
      face_id: row.face_id,
      customer_identifier: row.customer_identifier,
      customer_name: row.customer_name,
      customer_metadata: row.customer_metadata,
      face_identifier: row.face_identifier,
      face_detection: {
        bounding_box: row.bounding_box,
        confidence: row.confidence,
      },
      created_at: row.created_at,
      s3_keys: {
        original: row.original_image_path,
        face: row.face_image_path,
      },
    });
  } catch (error: unknown) {
    console.error("Error in getCustomerDetails:", error);
    sendErrorResponse(res, error);
  }
};

/**
 * DELETE /management/faces/:face_id
 * Delete a detected face and its S3 images
 */
export const deleteDetectedFace = async (req: Request, res: Response): Promise<void> => {
  try {
    const { face_id } = req.params;

    // Check if face is used by any enrolled customer
    const enrolledCheck = await client.query(
      "SELECT COUNT(*) as count FROM enrolled_customers WHERE face_id = $1",
      [face_id]
    );

    if (parseInt(enrolledCheck.rows[0].count) > 0) {
      res.status(400).json({
        error: "Cannot delete face",
        message: "This face is used by enrolled customers. Delete the customers first.",
      });
      return;
    }

    // Get S3 keys before deletion
    const faceResult = await client.query(
      "SELECT original_image_path, face_image_path FROM detected_faces WHERE id = $1",
      [face_id]
    );

    if (faceResult.rows.length === 0) {
      res.status(404).json({ error: "Face not found" });
      return;
    }

    const { original_image_path, face_image_path } = faceResult.rows[0];

    // Delete from database
    await client.query("DELETE FROM detected_faces WHERE id = $1", [face_id]);

    // Delete from S3
    try {
      await s3Service.deleteImage(original_image_path);
      await s3Service.deleteImage(face_image_path);
    } catch (s3Error) {
      console.warn("Failed to delete S3 images:", s3Error);
      // Continue anyway - database record is already deleted
    }

    res.json({
      message: "Face deleted successfully",
      face_id,
      deleted_s3_keys: {
        original: original_image_path,
        face: face_image_path,
      },
    });
  } catch (error: unknown) {
    console.error("Error in deleteDetectedFace:", error);
    sendErrorResponse(res, error);
  }
};

/**
 * DELETE /management/customers/:customer_id
 * Delete an enrolled customer
 */
export const deleteEnrolledCustomer = async (req: Request, res: Response): Promise<void> => {
  try {
    const { customer_id } = req.params;

    // Get customer details before deletion
    const customerResult = await client.query(
      "SELECT customer_identifier, customer_name FROM enrolled_customers WHERE id = $1",
      [customer_id]
    );

    if (customerResult.rows.length === 0) {
      res.status(404).json({ error: "Customer not found" });
      return;
    }

    const { customer_identifier, customer_name } = customerResult.rows[0];

    // Delete from database
    await client.query("DELETE FROM enrolled_customers WHERE id = $1", [customer_id]);

    res.json({
      message: "Customer deleted successfully",
      customer_id,
      customer_identifier,
      customer_name,
    });
  } catch (error: unknown) {
    console.error("Error in deleteEnrolledCustomer:", error);
    sendErrorResponse(res, error);
  }
};

/**
 * GET /management/stats
 * Get database statistics
 */
export const getStats = async (_req: Request, res: Response): Promise<void> => {
  try {
    const facesCount = await client.query("SELECT COUNT(*) as count FROM detected_faces");
    const customersCount = await client.query("SELECT COUNT(*) as count FROM enrolled_customers");

    // Count orphaned faces (not enrolled with any customer)
    const orphanedCount = await client.query(
      `SELECT COUNT(*) as count FROM detected_faces
       WHERE id NOT IN (SELECT face_id FROM enrolled_customers)`
    );

    res.json({
      detected_faces: parseInt(facesCount.rows[0].count),
      enrolled_customers: parseInt(customersCount.rows[0].count),
      orphaned_faces: parseInt(orphanedCount.rows[0].count),
    });
  } catch (error: unknown) {
    console.error("Error in getStats:", error);
    sendErrorResponse(res, error);
  }
};

/**
 * DELETE /management/faces/orphaned
 * Delete all orphaned faces (faces not enrolled with any customer)
 * This helps free up storage space by removing unused faces and their S3 images
 */
export const deleteOrphanedFaces = async (_req: Request, res: Response): Promise<void> => {
  try {
    // Find all faces that are not enrolled with any customer
    const orphanedFaces = await client.query(
      `SELECT id, original_image_path, face_image_path, identifier
       FROM detected_faces
       WHERE id NOT IN (SELECT face_id FROM enrolled_customers)`
    );

    if (orphanedFaces.rows.length === 0) {
      res.json({
        message: "No orphaned faces found",
        deleted_count: 0,
        deleted_faces: [],
      });
      return;
    }

    const deletedFaces = [];
    let successCount = 0;
    let failedCount = 0;

    // Delete each orphaned face
    for (const face of orphanedFaces.rows) {
      try {
        // Delete from database
        await client.query("DELETE FROM detected_faces WHERE id = $1", [face.id]);

        // Delete from S3
        try {
          await s3Service.deleteImage(face.original_image_path);
          await s3Service.deleteImage(face.face_image_path);
        } catch (s3Error) {
          console.warn(`Failed to delete S3 images for face ${face.id}:`, s3Error);
          // Continue anyway - database record is already deleted
        }

        deletedFaces.push({
          face_id: face.id,
          identifier: face.identifier,
          s3_keys: {
            original: face.original_image_path,
            face: face.face_image_path,
          },
        });
        successCount++;
      } catch (error) {
        console.error(`Failed to delete face ${face.id}:`, error);
        failedCount++;
      }
    }

    res.json({
      message: `Successfully deleted ${successCount} orphaned face(s)`,
      deleted_count: successCount,
      failed_count: failedCount,
      deleted_faces: deletedFaces,
    });
  } catch (error: unknown) {
    console.error("Error in deleteOrphanedFaces:", error);
    sendErrorResponse(res, error);
  }
};
