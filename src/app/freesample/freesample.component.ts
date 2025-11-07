import { Component, Input, OnInit, OnChanges, SimpleChanges, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { ApiService } from '../services/api.service';
import Swal from 'sweetalert2';
import { environment } from '../../environments/environment';

@Component({
  selector: 'app-freesample',
  standalone: true,
  imports: [CommonModule, MatButtonModule, MatCardModule, MatProgressSpinnerModule],
  templateUrl: './freesample.component.html',
  styleUrls: ['./freesample.component.css'],

})
export class FreesampleComponent implements OnInit, OnChanges {
  @Input() freesampledata: any;

  freeSampleOrderData: any = [];
  isLoading = false;
  isAddingToCart = false;

  constructor(
    private cdr: ChangeDetectorRef,
    private apiService: ApiService,
  ) { }

  ngOnInit(): void {
  }

  ngOnChanges(changes: SimpleChanges): void {
    this.cdr.detectChanges();
  }

  buyFreeSample() {
    this.isLoading = true;
    this.handleAddToCart(true);
  }

  addToCart() {
    this.isAddingToCart = true;
    this.handleAddToCart(false);
  }

  private handleAddToCart(redirect: boolean) {
    let form_data = this.freesampledata.form_data;
    let productId = this.freesampledata.product_id;
    let api_url = this.freesampledata.api_url;
    let cartproductName = this.freesampledata.productname;
    let priceData = this.freesampledata.free_sample_price;
    let vatpercentage = Number(this.freesampledata.vatpercentage);
    let vatname = this.freesampledata.vatname;
    let current_url = this.freesampledata.current_url;
    let productname = this.freesampledata.productname;
    let categoryId = Number(this.freesampledata.catagory_id);
    let visualizer_url = this.freesampledata.pei_ecomImage;
    let action = this.freesampledata.type;

    this.apiService.addToCart(
      form_data,
      productId,
      api_url,
      cartproductName,
      priceData,
      vatpercentage,
      vatname,
      current_url,
      productname,
      categoryId,
      visualizer_url,
      action
    ).subscribe({
      next: (data) => {
        if (redirect) {
          this.isLoading = false;
        } else {
          this.isAddingToCart = false;
        }
        if (data.success) {
          Swal.fire({
            title: 'Added to Cart!',
            text: 'Free Sample has been added successfully.',
            icon: 'success',
            showConfirmButton: false,
            timer: 3000,
            background: '#fefefe',
            color: '#333',
            customClass: {
              popup: 'small-toast'
            }
          }).then(() => {
            if (redirect) {
              window.location.href = environment.site + '/cart';
            }
          });
        }
      },
      error: (err) => {
        if (redirect) {
          this.isLoading = false;
        } else {
          this.isAddingToCart = false;
        }
        console.log(err, "error");
      }
    });
  }
}
