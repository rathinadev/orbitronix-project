import open3d as o3d
import numpy as np
import pandas as pd

# Load CSV file into a DataFrame
df = pd.read_csv("csv_data/CSite1_orig-utm.csv")
points = df.to_numpy()  # Convert to a NumPy array

# Create an Open3D PointCloud from the points
pcd = o3d.geometry.PointCloud()
pcd.points = o3d.utility.Vector3dVector(points)

# Visualize the point cloud
o3d.visualization.draw_geometries([pcd])
