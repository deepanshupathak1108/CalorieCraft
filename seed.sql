USE caloriecraft;

ALTER TABLE foods ADD UNIQUE KEY uq_food_name_serving (name, serving_g);

INSERT INTO foods
(name,cuisine,diet_type,serving_g,calories,protein_g,carbs_g,fat_g,estimated_cost,allergens)
VALUES
('Oats','Indian','vegetarian',50,195,6.5,33,3.5,12,'Gluten'),
('Milk','Indian','vegetarian',250,150,8,12,8,18,'Milk'),
('Banana','Indian','vegan',120,105,1.3,27,0.3,8,NULL),
('Whey Protein','Western','vegetarian',30,120,24,3,2,35,'Milk'),
('Rice','Indian','vegan',200,260,5,56,0.6,18,NULL),
('Dal','Indian','vegan',200,230,14,36,2,25,NULL),
('Paneer','Indian','vegetarian',100,265,18,6,20,45,'Milk'),
('Curd','Indian','vegetarian',150,90,5,7,4,18,'Milk'),
('Roasted Chana','Indian','vegan',50,190,10,30,3,15,NULL),
('Roti','Indian','vegan',2,210,7,42,2,12,'Gluten'),
('Rajma','Indian','vegan',200,250,17,45,1,28,NULL),
('Mixed Vegetables','Indian','vegan',200,120,5,20,3,25,NULL),
('Soy Chunks','Indian','vegan',50,172,26,16,0.5,16,'Soy'),
('Peanuts','Indian','vegan',30,170,7.5,5,15,8,'Peanuts'),
('Potato','Indian','vegan',200,154,4,35,0.2,10,NULL),
('Whole Wheat Bread','Western','vegan',60,150,6,28,2,20,'Gluten'),
('Eggs','Indian','eggetarian',100,143,12.6,0.7,9.5,20,'Egg'),
('Chicken Breast','Western','non_vegetarian',150,248,46,0,5.4,65,NULL),
('Greek Yogurt','Mediterranean','vegetarian',170,100,17,6,0.7,55,'Milk'),
('Olive Oil','Mediterranean','vegan',10,88,0,0,10,12,NULL),
('Apple','Western','vegan',180,95,0.5,25,0.3,25,NULL),
('Lentil Soup','Mediterranean','vegan',300,210,14,34,2.5,40,NULL)
ON DUPLICATE KEY UPDATE
cuisine=VALUES(cuisine),diet_type=VALUES(diet_type),calories=VALUES(calories),protein_g=VALUES(protein_g),
carbs_g=VALUES(carbs_g),fat_g=VALUES(fat_g),estimated_cost=VALUES(estimated_cost),allergens=VALUES(allergens);
