import fs from "fs";
import csv from "csv-parser";

import {
  CategoryModel,
  SubCategoryModel,
  ContentModel,
} from "../category/category.model";

interface CSVRow {
  categoryName: string;
  categoryStatus: "Active" | "Inactive" | "Deleted";
  subcategoryName: string;
  subcategoryStatus: "Active" | "Inactive" | "Deleted";
  contentName: string;
  contentStatus: "Active" | "Inactive" | "Deleted";
}

export const bulkUploadCSVService = async (filePath: string) => {
  const rows: CSVRow[] = [];

  

  return new Promise((resolve, reject) => {
    fs.createReadStream(filePath)
      .pipe(csv())
      .on("data", (data) => {
        rows.push(data);
      })
      .on("end", async () => {
        try {
          let createdCategories = 0;
          let createdSubcategories = 0;
          let createdContents = 0;
          let skippedContents = 0;

          for (const row of rows) {
            const {
              categoryName,
              categoryStatus,
              subcategoryName,
              subcategoryStatus,
              contentName,
              contentStatus,
            } = row;

            // =========================
            // CATEGORY
            // =========================
            let category = await CategoryModel.findOne({
              name: categoryName.trim(),
            });

            if (!category) {
              category = await CategoryModel.create({
                name: categoryName.trim(),
                status: categoryStatus || "Active",
              });

              createdCategories++;
            }

            // =========================
            // SUBCATEGORY
            // =========================
            let subcategory = await SubCategoryModel.findOne({
              name: subcategoryName.trim(),
              categoryId: category._id,
            });

            if (!subcategory) {
              subcategory = await SubCategoryModel.create({
                name: subcategoryName.trim(),
                categoryId: category._id,
                status: subcategoryStatus || "Active",
              });

              createdSubcategories++;
            }

            // =========================
            // CONTENT
            // =========================
            const existingContent = await ContentModel.findOne({
              name: contentName.trim(),
              subcategoryId: subcategory._id,
            });

            if (existingContent) {
              skippedContents++;
              continue;
            }

            await ContentModel.create({
              name: contentName.trim(),
              subcategoryId: subcategory._id,
              status: contentStatus || "Active",
            });

            createdContents++;
          }

          // Delete uploaded CSV after processing
          fs.unlinkSync(filePath);

          resolve({
            success: true,
            summary: {
              createdCategories,
              createdSubcategories,
              createdContents,
              skippedContents,
              totalRows: rows.length,
            },
          });
        } catch (error) {
          reject(error);
        }
      })
      .on("error", (error) => {
        reject(error);
      });
  });
};
