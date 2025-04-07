import open3d as o3d
import numpy as np

# Load the PCD file (replace with actual path)
pcd = o3d.io.read_point_cloud("terrain/samp52-utm-ground.pcd")

# Downsample point cloud to reduce density and speed up processing
pcd = pcd.voxel_down_sample(voxel_size=0.05)  # Adjust voxel size if needed

# Remove outliers (optional but useful)
pcd, _ = pcd.remove_statistical_outlier(nb_neighbors=20, std_ratio=2.0)

# Visualize the cleaned point cloud
o3d.visualization.draw_geometries([pcd], window_name="Filtered Point Cloud")

